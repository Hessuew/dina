import type { z } from 'zod'
import type {
  resendOtpSchema,
  signupSchema,
  verifyOtpSchema,
} from '@/schemas/auth.schema'
import type { LogLevel } from '@/utils/observability/logger'
import { sendTransactionalEmail } from '@/utils/email'
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from '@/utils/supabase'
import {
  calculateOtpExpiry,
  checkOtpResendCooldown,
  generateOTP,
  hashValue,
  validateOtpRecord,
  validateSignupInvitation,
} from '@/utils/signup/domain/signup.domain'
import {
  clearInvitationOtp,
  findInvitationByToken,
  findProfileByEmail,
  incrementOtpAttempts,
  insertProfileOnConflict,
  markInvitationAccepted,
  updateInvitationOtp,
} from '@/utils/signup/repository'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'

/* v8 ignore start */
type SignupAction = 'signup' | 'verify_otp' | 'resend_otp'

type SignupLogContext = {
  action: SignupAction
  startedAt: number
}

function logSignupEvent(
  level: LogLevel,
  event: string,
  context: SignupLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    ...fields,
  })
}

async function sendOtpEmail(
  email: string,
  otp: string,
): Promise<{ error: unknown }> {
  try {
    await sendTransactionalEmail({
      type: 'signupOtp',
      to: email,
      otp,
      expiryMinutes: 10,
    })
    return { error: null }
  } catch (error) {
    return { error }
  }
}

export async function signupService(
  data: z.infer<typeof signupSchema>,
): Promise<{
  error: boolean
  requiresOtp?: boolean
  email?: string
  message: string
}> {
  const context: SignupLogContext = {
    action: 'signup',
    startedAt: performance.now(),
  }
  const invitation = await findInvitationByToken(data.token)

  if (!invitation) {
    return { error: true, message: 'Invalid invitation token' }
  }

  const invValid = validateSignupInvitation(invitation, data.email, new Date())
  if (!invValid.valid) {
    return { error: true, message: invValid.message }
  }

  const otp = generateOTP()
  await updateInvitationOtp(invitation.id, {
    otpHash: hashValue(otp),
    otpExpiresAt: calculateOtpExpiry(new Date()),
    otpAttempts: 0,
    updatedAt: new Date(),
  })

  const { error: emailError } = await sendOtpEmail(data.email, otp)
  if (emailError) {
    logSignupEvent('error', 'signup_otp_email_failed', context, {
      errorCategory: 'otp_email_delivery',
      invitationId: invitation.id,
    })
    try {
      await clearInvitationOtp(invitation.id)
    } catch {
      logSignupEvent('error', 'signup_otp_cleanup_failed', context, {
        errorCategory: 'otp_cleanup',
        invitationId: invitation.id,
      })
    }
    return {
      error: true,
      message: 'Unable to send verification email. Please contact support.',
    }
  }

  logSignupEvent('info', 'signup_otp_sent', context, {
    invitationId: invitation.id,
  })
  return {
    error: false,
    requiresOtp: true,
    email: data.email,
    message: 'Please check your email for the verification code.',
  }
}

// Confirms an existing auth user's email when createUser reports a duplicate.
// Returns the existing profile id on success.
async function confirmExistingUser(
  email: string,
  cause: { code?: string; message: string },
  context: SignupLogContext,
): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  const existing = await findProfileByEmail(email)
  if (!existing) {
    logSignupEvent('error', 'signup_duplicate_profile_missing', context, {
      errorCategory: 'duplicate_profile_missing',
      providerCode: cause.code ?? 'unknown',
    })
    return {
      ok: false,
      message: 'This email is already registered. Please log in.',
    }
  }
  const { error: updateError } =
    await getSupabaseAdminClient().auth.admin.updateUserById(existing.id, {
      email_confirm: true,
    })
  if (updateError) {
    logSignupEvent(
      'error',
      'signup_existing_user_confirmation_failed',
      context,
      {
        errorCategory: 'duplicate_user_confirmation',
        providerCode: updateError.code ?? 'unknown',
        userId: existing.id,
      },
    )
    return {
      ok: false,
      message:
        'Something went wrong during signup. Please try again or contact support.',
    }
  }
  return { ok: true, userId: existing.id }
}

// Resolves the auth userId for a verified email: creates a new user (happy path)
// or confirms the existing one on a duplicate-email code. Returns isNew=false for
// the idempotent path so the caller knows not to roll back on profile failure.
async function resolveAuthUser(
  email: string,
  password: string,
  context: SignupLogContext,
): Promise<
  { ok: true; userId: string; isNew: boolean } | { ok: false; message: string }
> {
  const created = await getSupabaseAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (!created.error) {
    return { ok: true, userId: created.data.user.id, isNew: true }
  }
  const isDuplicate =
    created.error.code === 'email_exists' ||
    created.error.code === 'user_already_exists'
  if (!isDuplicate) {
    logSignupEvent('error', 'signup_user_creation_failed', context, {
      errorCategory: 'auth_user_creation',
      providerCode: created.error.code ?? 'unknown',
    })
    return {
      ok: false,
      message:
        'Unable to create your account. Please try again or contact support.',
    }
  }
  const confirmed = await confirmExistingUser(email, created.error, context)
  return confirmed.ok ? { ...confirmed, isNew: false } : confirmed
}

// Create the account only after the OTP proves the email. Rolls back a freshly-created
// auth user if the subsequent profile insert throws.
async function provisionVerifiedAccount(input: {
  email: string
  password: string
  fullName?: string
  role: Parameters<typeof insertProfileOnConflict>[0]['role']
  context: SignupLogContext
}): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  const resolved = await resolveAuthUser(
    input.email,
    input.password,
    input.context,
  )
  if (!resolved.ok) return resolved

  try {
    await insertProfileOnConflict({
      id: resolved.userId,
      email: input.email,
      fullName: input.fullName || input.email.split('@')[0],
      role: input.role,
    })
    return { ok: true, userId: resolved.userId }
  } catch {
    logSignupEvent('error', 'signup_profile_insert_failed', input.context, {
      errorCategory: 'profile_persistence',
      userId: resolved.userId,
    })
    if (resolved.isNew) {
      try {
        await getSupabaseAdminClient().auth.admin.deleteUser(resolved.userId)
      } catch {
        logSignupEvent('error', 'signup_user_rollback_failed', input.context, {
          errorCategory: 'auth_user_rollback',
          userId: resolved.userId,
        })
      }
    }
    return {
      ok: false,
      message:
        'Something went wrong during signup. Please try again or contact support.',
    }
  }
}

async function completeVerifiedSignup(input: {
  invitationId: string
  email: string
  password: string
  userId: string
  context: SignupLogContext
}): Promise<{ success: boolean; loginFailed?: boolean; message: string }> {
  await markInvitationAccepted(input.invitationId)
  await clearInvitationOtp(input.invitationId)

  const { error: loginError } =
    await getSupabaseServerClient().auth.signInWithPassword({
      email: input.email,
      password: input.password,
    })

  if (loginError) {
    logSignupEvent('error', 'signup_auto_login_failed', input.context, {
      errorCategory: 'auto_login',
      invitationId: input.invitationId,
      status: 'partial_failure',
    })
    return {
      success: true,
      loginFailed: true,
      message: 'Email verified! Please log in to continue.',
    }
  }

  logSignupEvent('info', 'signup_verified', input.context, {
    invitationId: input.invitationId,
    userId: input.userId,
  })
  return {
    success: true,
    loginFailed: false,
    message: 'Email verified successfully!',
  }
}

export async function verifyOtpService(
  data: z.infer<typeof verifyOtpSchema>,
): Promise<{ success: boolean; loginFailed?: boolean; message: string }> {
  const context: SignupLogContext = {
    action: 'verify_otp',
    startedAt: performance.now(),
  }
  const invitation = await findInvitationByToken(data.invitationToken)

  if (!invitation) {
    return { success: false, message: 'Invalid invitation' }
  }

  const otpValid = validateOtpRecord(
    {
      otpHash: invitation.otpHash,
      otpExpiresAt: invitation.otpExpiresAt,
      attempts: invitation.otpAttempts,
    },
    new Date(),
  )
  if (!otpValid.valid) {
    return { success: false, message: otpValid.message }
  }

  const submittedHash = hashValue(data.otp)
  if (submittedHash !== invitation.otpHash) {
    await incrementOtpAttempts(invitation.id)
    const attemptsLeft = 5 - (invitation.otpAttempts + 1)
    return {
      success: false,
      message: `Invalid code. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
    }
  }

  const provision = await provisionVerifiedAccount({
    email: invitation.email,
    password: data.password,
    fullName: data.fullName,
    role: invitation.role,
    context,
  })
  if (!provision.ok) {
    return { success: false, message: provision.message }
  }

  return completeVerifiedSignup({
    invitationId: invitation.id,
    email: data.email,
    password: data.password,
    userId: provision.userId,
    context,
  })
}

export async function resendOtpService(
  data: z.infer<typeof resendOtpSchema>,
): Promise<{ success: boolean; message: string }> {
  const context: SignupLogContext = {
    action: 'resend_otp',
    startedAt: performance.now(),
  }
  const invitation = await findInvitationByToken(data.invitationToken)

  if (!invitation) {
    return { success: false, message: 'Invalid invitation' }
  }

  const waitSeconds = checkOtpResendCooldown(
    invitation.otpExpiresAt,
    new Date(),
  )
  if (waitSeconds !== null) {
    return {
      success: false,
      message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
    }
  }

  const otp = generateOTP()
  const otpHash = hashValue(otp)
  const otpExpiresAt = calculateOtpExpiry(new Date())

  await updateInvitationOtp(invitation.id, {
    otpHash,
    otpExpiresAt,
    otpAttempts: 0,
    updatedAt: new Date(),
  })

  const { error: emailError } = await sendOtpEmail(invitation.email, otp)
  if (emailError) {
    logSignupEvent('error', 'signup_otp_resend_failed', context, {
      errorCategory: 'otp_resend_delivery',
      invitationId: invitation.id,
    })
    return {
      success: false,
      message: 'Failed to send verification code. Please try again.',
    }
  }

  logSignupEvent('info', 'signup_otp_resent', context, {
    invitationId: invitation.id,
  })
  return { success: true, message: 'New verification code sent!' }
}
/* v8 ignore end */
