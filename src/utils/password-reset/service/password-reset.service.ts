import crypto from 'node:crypto'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import { PasswordResetEmail } from '@/emails/PasswordResetEmail'
import { env } from '@/env'
import { getSupabaseAdminClient } from '@/utils/supabase'
import {
  calculatePasswordResetExpiry,
  checkPasswordResetCooldown,
  checkPasswordResetTokenValid,
  generatePasswordResetToken,
} from '@/utils/password-reset/domain/password-reset.domain'
import {
  clearProfileResetToken,
  findProfileByEmail,
  findProfileByResetTokenHash,
  incrementResetTokenAttempts,
  updateProfileResetToken,
} from '@/utils/password-reset/repository'

/* v8 ignore start */
export async function requestPasswordResetService(
  email: string,
): Promise<{ success: boolean; message: string }> {
  const user = await findProfileByEmail(email)

  if (!user) {
    return {
      success: true,
      message:
        'If an account exists with this email, you will receive a password reset link.',
    }
  }

  const lastResetRequestAt = user.accountSecurity.lastResetRequestAt ?? null
  if (lastResetRequestAt) {
    const waitSeconds = checkPasswordResetCooldown(
      lastResetRequestAt,
      new Date(),
    )
    if (waitSeconds !== null) {
      return {
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting another reset link.`,
      }
    }
  }

  const { token, tokenHash } = generatePasswordResetToken()
  const expiresAt = calculatePasswordResetExpiry(new Date())

  await updateProfileResetToken(user.id, {
    resetTokenHash: tokenHash,
    resetTokenExpiresAt: expiresAt,
    resetTokenAttempts: 0,
    lastResetRequestAt: new Date(),
    updatedAt: new Date(),
  })

  const appUrl = env.APP_URL || 'http://localhost:3000'
  const resetLink = `${appUrl}/reset-password?token=${token}`

  const emailHtml = await render(
    PasswordResetEmail({ resetLink, expiryMinutes: 10 }),
  )

  const resend = new Resend(env.RESEND_API_KEY)
  const { error: emailError } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: email,
    subject: 'Reset your password',
    html: emailHtml,
  })

  if (emailError) {
    console.error('Failed to send password reset email:', emailError)
    await clearProfileResetToken(user.id)
    return {
      success: false,
      message: 'Failed to send reset email. Please try again.',
    }
  }

  return {
    success: true,
    message:
      'If an account exists with this email, you will receive a password reset link.',
  }
}

export async function validateResetTokenService(
  token: string | undefined,
): Promise<{ valid: boolean; message: string }> {
  if (!token) {
    return { valid: false, message: 'No reset token provided' }
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const user = await findProfileByResetTokenHash(tokenHash)

  if (!user) {
    return { valid: false, message: 'Invalid reset token' }
  }

  return checkPasswordResetTokenValid(
    { expiresAt: user.resetTokenExpiresAt, attempts: user.resetTokenAttempts },
    new Date(),
  )
}

export async function resetPasswordService(
  token: string | undefined,
  newPassword: string | undefined,
): Promise<{ success: boolean; message: string }> {
  if (!token || !newPassword) {
    return { success: false, message: 'Missing required fields' }
  }

  if (newPassword.length < 8) {
    return { success: false, message: 'Password must be at least 8 characters' }
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const user = await findProfileByResetTokenHash(tokenHash)

  if (!user) {
    return { success: false, message: 'Invalid reset token' }
  }

  const validity = checkPasswordResetTokenValid(
    { expiresAt: user.resetTokenExpiresAt, attempts: user.resetTokenAttempts },
    new Date(),
  )
  if (!validity.valid) {
    return { success: false, message: validity.message }
  }

  const supabaseAdmin = getSupabaseAdminClient()
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    user.id,
    {
      password: newPassword,
    },
  )

  if (updateError) {
    console.error('Failed to update password:', updateError)
    await incrementResetTokenAttempts(user.id)
    return {
      success: false,
      message: 'Failed to reset password. Please try again.',
    }
  }

  await clearProfileResetToken(user.id)

  return { success: true, message: 'Password reset successfully' }
}
/* v8 ignore end */
