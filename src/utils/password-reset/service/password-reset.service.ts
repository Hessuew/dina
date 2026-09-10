import crypto from 'node:crypto'
import type { LogLevel } from '@/utils/observability/logger'
import { env } from '@/env'
import { sendTransactionalEmail } from '@/utils/email'
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
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'

/* v8 ignore start */
type PasswordResetAction = 'request_password_reset' | 'reset_password'

type PasswordResetLogContext = {
  action: PasswordResetAction
  startedAt: number
}

function logPasswordResetEvent(
  level: LogLevel,
  event: string,
  context: PasswordResetLogContext,
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

export async function requestPasswordResetService(
  email: string,
): Promise<{ success: boolean; message: string }> {
  const context: PasswordResetLogContext = {
    action: 'request_password_reset',
    startedAt: performance.now(),
  }
  const user = await findProfileByEmail(email)

  if (!user) {
    return { success: true, message: RESET_ANONYMOUS_MESSAGE }
  }

  const lastResetRequestAt = (
    user.accountSecurity as { lastResetRequestAt: Date } | null
  )?.lastResetRequestAt
  const cooldownMessage = resolveCooldownMessage(lastResetRequestAt, new Date())
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

  try {
    await sendTransactionalEmail({
      type: 'passwordReset',
      to: email,
      resetLink,
      expiryMinutes: 10,
    })
  } catch {
    logPasswordResetEvent('error', 'password_reset_email_failed', context, {
      errorCategory: 'password_reset_email_delivery',
      userId: user.id,
    })
    await clearProfileResetToken(user.id)
    return {
      success: false,
      message: 'Failed to send reset email. Please try again.',
    }
  }

  logPasswordResetEvent('info', 'password_reset_email_sent', context, {
    userId: user.id,
  })
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
  const context: PasswordResetLogContext = {
    action: 'reset_password',
    startedAt: performance.now(),
  }
  const input = checkResetPasswordInput(token, newPassword)
  if (!input.ok) {
    return { success: false, message: input.message }
  }

  const tokenHash = crypto
    .createHash('sha256')
    .update(input.token)
    .digest('hex')
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
    logPasswordResetEvent('error', 'password_reset_update_failed', context, {
      errorCategory: 'password_reset_update',
      providerCode: updateError.code ?? 'unknown',
      userId: resolved.user.id,
    })
    await incrementResetTokenAttempts(resolved.user.id)
    return {
      success: false,
      message: 'Failed to reset password. Please try again.',
    }
  }

  await clearProfileResetToken(resolved.user.id)

  logPasswordResetEvent('info', 'password_reset_completed', context, {
    userId: resolved.user.id,
  })
  return { success: true, message: 'Password reset successfully' }
}
/* v8 ignore end */
