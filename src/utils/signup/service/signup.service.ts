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

  const supabaseAdmin = getSupabaseAdminClient()
  const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: false,
  })

  if (error) {
    console.error('Supabase user creation error:', error)
    return {
      error: true,
      message:
        'Unable to create your account. Please try again or contact support.',
    }
  }

  try {
    await insertProfileOnConflict({
      id: authData.user.id,
      email: authData.user.email!,
      fullName: data.fullName || authData.user.email!.split('@')[0],
      role: invitation.role,
    })

    await markInvitationAccepted(invitation.id)

    const otp = generateOTP()
    const otpHash = hashValue(otp)
    const otpExpiresAt = calculateOtpExpiry(new Date())

    await updateInvitationOtp(invitation.id, {
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,
      updatedAt: new Date(),
    })

    const { error: emailError } = await sendOtpEmail(data.email, otp)
    if (emailError) {
      console.error('Failed to send OTP email:', emailError)
      throw new Error(
        'Unable to send verification email. Please contact support.',
      )
    }

    return {
      error: false,
      requiresOtp: true,
      email: data.email,
      message:
        'Account created! Please check your email for the verification code.',
    }
  } catch (err) {
    console.error('Signup error:', err)
    try {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    } catch (deleteError) {
      console.error('Failed to rollback user creation:', deleteError)
    }
    return {
      error: true,
      message:
        err instanceof Error && err.message.includes('contact support')
          ? err.message
          : 'Something went wrong during signup. Please try again or contact support.',
    }
  }
}

export async function verifyOtpService(
  data: z.infer<typeof verifyOtpSchema>,
): Promise<{ success: boolean; loginFailed?: boolean; message: string }> {
  const supabase = getSupabaseServerClient()
  const supabaseAdmin = getSupabaseAdminClient()

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

  const profile = await findProfileByEmail(invitation.email)
  if (!profile) {
    return { success: false, message: 'User not found' }
  }

  await supabaseAdmin.auth.admin.updateUserById(profile.id, {
    email_confirm: true,
  })
  await clearInvitationOtp(invitation.id)

  const { error: loginError } = await supabase.auth.signInWithPassword({
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
