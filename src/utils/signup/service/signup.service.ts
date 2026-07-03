import { render } from '@react-email/render'
import { Resend } from 'resend'
import type { z } from 'zod'
import type {
  resendOtpSchema,
  signupSchema,
  verifyOtpSchema,
} from '@/schemas/auth.schema'
import { OTPVerificationEmail } from '@/emails/OTPVerificationEmail'
import { env } from '@/env'
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

/* v8 ignore start */
async function sendOtpEmail(
  email: string,
  otp: string,
): Promise<{ error: unknown }> {
  const emailHtml = await render(
    OTPVerificationEmail({ otp, expiryMinutes: 10 }),
  )
  const resend = new Resend(env.RESEND_API_KEY)
  return resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: email,
    subject: 'Your verification code',
    html: emailHtml,
  })
}

export async function signupService(
  data: z.infer<typeof signupSchema>,
): Promise<{
  error: boolean
  requiresOtp?: boolean
  email?: string
  message: string
}> {
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
    console.error('Failed to send OTP email:', emailError)
    try {
      await clearInvitationOtp(invitation.id)
    } catch (clearErr) {
      console.error('Failed to clear stale OTP after email failure:', clearErr)
    }
    return {
      error: true,
      message: 'Unable to send verification email. Please contact support.',
    }
  }

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
): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  const existing = await findProfileByEmail(email)
  if (!existing) {
    console.error('Duplicate email but no profile found:', cause)
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
    console.error('Failed to confirm existing user:', updateError)
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
    console.error('createUser failed with non-duplicate error:', created.error)
    return {
      ok: false,
      message:
        'Unable to create your account. Please try again or contact support.',
    }
  }
  const confirmed = await confirmExistingUser(email, created.error)
  return confirmed.ok ? { ...confirmed, isNew: false } : confirmed
}

// Create the account only after the OTP proves the email. Rolls back a freshly-created
// auth user if the subsequent profile insert throws.
async function provisionVerifiedAccount(input: {
  email: string
  password: string
  fullName?: string
  role: Parameters<typeof insertProfileOnConflict>[0]['role']
}): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  const resolved = await resolveAuthUser(input.email, input.password)
  if (!resolved.ok) return resolved

  try {
    await insertProfileOnConflict({
      id: resolved.userId,
      email: input.email,
      fullName: input.fullName || input.email.split('@')[0],
      role: input.role,
    })
    return { ok: true, userId: resolved.userId }
  } catch (err) {
    console.error('Profile insert failed after user creation:', err)
    if (resolved.isNew) {
      try {
        await getSupabaseAdminClient().auth.admin.deleteUser(resolved.userId)
      } catch (deleteError) {
        console.error('Failed to rollback user creation:', deleteError)
      }
    }
    return {
      ok: false,
      message:
        'Something went wrong during signup. Please try again or contact support.',
    }
  }
}

export async function verifyOtpService(
  data: z.infer<typeof verifyOtpSchema>,
): Promise<{ success: boolean; loginFailed?: boolean; message: string }> {
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
  })
  if (!provision.ok) {
    return { success: false, message: provision.message }
  }

  await markInvitationAccepted(invitation.id)
  await clearInvitationOtp(invitation.id)

  const { error: loginError } =
    await getSupabaseServerClient().auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

  if (loginError) {
    console.error('Auto-login failed after OTP verification:', loginError)
    return {
      success: true,
      loginFailed: true,
      message: 'Email verified! Please log in to continue.',
    }
  }

  return {
    success: true,
    loginFailed: false,
    message: 'Email verified successfully!',
  }
}

export async function resendOtpService(
  data: z.infer<typeof resendOtpSchema>,
): Promise<{ success: boolean; message: string }> {
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
    console.error('Failed to send OTP email:', emailError)
    return {
      success: false,
      message: 'Failed to send verification code. Please try again.',
    }
  }

  return { success: true, message: 'New verification code sent!' }
}
/* v8 ignore end */
