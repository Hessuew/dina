import crypto from 'node:crypto'

const RESET_EXPIRY_MS = 10 * 60 * 1000
const COOLDOWN_MS = 60 * 1000

export function generatePasswordResetToken(): {
  token: string
  tokenHash: string
} {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  return { token, tokenHash }
}

export function calculatePasswordResetExpiry(now: Date): Date {
  return new Date(now.getTime() + RESET_EXPIRY_MS)
}

export function checkPasswordResetCooldown(
  lastRequestAt: Date | null,
  now: Date,
): number | null {
  if (!lastRequestAt) return null
  const timeSinceMs = now.getTime() - lastRequestAt.getTime()
  if (timeSinceMs >= COOLDOWN_MS) return null
  return Math.ceil((COOLDOWN_MS - timeSinceMs) / 1000)
}

export function checkPasswordResetTokenValid(
  record: { expiresAt: Date | null; attempts: number },
  now: Date,
): { valid: boolean; message: string } {
  if (!record.expiresAt) {
    return { valid: false, message: 'Reset token has expired' }
  }
  if (now > record.expiresAt) {
    return {
      valid: false,
      message: 'Reset token has expired. Please request a new one.',
    }
  }
  if (record.attempts >= 5) {
    return {
      valid: false,
      message: 'Too many failed attempts. Please request a new reset link.',
    }
  }
  return { valid: true, message: 'Token is valid' }
}
