import {
  checkPasswordResetCooldown,
  checkPasswordResetTokenValid,
} from './password-reset.domain'

/** Anonymous response — identical for "no account" and "email sent" so callers cannot probe which emails exist. */
export const RESET_ANONYMOUS_MESSAGE =
  'If an account exists with this email, you will receive a password reset link.'

/**
 * The cooldown rejection message, or null when a new reset link may be sent.
 * Wraps the cooldown clock check so the service holds no cooldown branching.
 */
export function resolveCooldownMessage(
  lastRequestAt: Date | null | undefined,
  now: Date,
): string | null {
  const waitSeconds = checkPasswordResetCooldown(lastRequestAt ?? null, now)
  if (waitSeconds === null) return null
  return `Please wait ${waitSeconds} seconds before requesting another reset link.`
}

/** Build the absolute reset link, falling back to localhost when APP_URL is unset. */
export function buildPasswordResetLink(
  envUrl: string | undefined,
  token: string,
): string {
  const appUrl = envUrl || 'http://localhost:3000'
  return `${appUrl}/reset-password?token=${token}`
}

export type ResetInputCheck =
  | { ok: true; token: string; newPassword: string }
  | { ok: false; message: string }

/** Validate the reset-password form input, narrowing token/newPassword on success. */
export function checkResetPasswordInput(
  token: string | undefined,
  newPassword: string | undefined,
): ResetInputCheck {
  if (!token || !newPassword) {
    return { ok: false, message: 'Missing required fields' }
  }
  if (newPassword.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters' }
  }
  return { ok: true, token, newPassword }
}

export type ResetUserRecord = {
  id: string
  resetTokenExpiresAt: Date | null
  resetTokenAttempts: number
}

export type ResolvedResetUser =
  | { ok: true; user: ResetUserRecord }
  | { ok: false; message: string }

/**
 * Resolve the user a reset token points to and confirm the token is still
 * valid, collapsing the "no such token" and "token expired/locked" decisions
 * into one result the service can branch on once.
 */
export function resolveValidResetUser(
  user: ResetUserRecord | null | undefined,
  now: Date,
): ResolvedResetUser {
  if (!user) {
    return { ok: false, message: 'Invalid reset token' }
  }
  const validity = checkPasswordResetTokenValid(
    { expiresAt: user.resetTokenExpiresAt, attempts: user.resetTokenAttempts },
    now,
  )
  if (!validity.valid) {
    return { ok: false, message: validity.message }
  }
  return { ok: true, user }
}
