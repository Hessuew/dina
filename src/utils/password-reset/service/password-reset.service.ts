import crypto from 'node:crypto'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import { PasswordResetEmail } from '@/emails/PasswordResetEmail'
import { env } from '@/env'
import { getSupabaseAdminClient } from '@/utils/supabase'
import {
  calculatePasswordResetExpiry,
  checkPasswordResetTokenValid,
  generatePasswordResetToken,
} from '@/utils/password-reset/domain/password-reset.domain'
import {
  RESET_ANONYMOUS_MESSAGE,
  buildPasswordResetLink,
  checkResetPasswordInput,
  resolveCooldownMessage,
  resolveValidResetUser,
} from '@/utils/password-reset/domain/password-reset-flow.domain'
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
    return { success: true, message: RESET_ANONYMOUS_MESSAGE }
  }

  const cooldownMessage = resolveCooldownMessage(
    user.accountSecurity.lastResetRequestAt,
    new Date(),
  )
  if (cooldownMessage) {
    return { success: false, message: cooldownMessage }
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

  const resetLink = buildPasswordResetLink(env.APP_URL, token)

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

  return { success: true, message: RESET_ANONYMOUS_MESSAGE }
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
  const input = checkResetPasswordInput(token, newPassword)
  if (!input.ok) {
    return { success: false, message: input.message }
  }

  const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex')
  const user = await findProfileByResetTokenHash(tokenHash)

  const resolved = resolveValidResetUser(user, new Date())
  if (!resolved.ok) {
    return { success: false, message: resolved.message }
  }

  const supabaseAdmin = getSupabaseAdminClient()
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    resolved.user.id,
    {
      password: input.newPassword,
    },
  )

  if (updateError) {
    console.error('Failed to update password:', updateError)
    await incrementResetTokenAttempts(resolved.user.id)
    return {
      success: false,
      message: 'Failed to reset password. Please try again.',
    }
  }

  await clearProfileResetToken(resolved.user.id)

  return { success: true, message: 'Password reset successfully' }
}
/* v8 ignore end */
