import crypto from 'node:crypto'

const RATE_LIMIT_MS = 60 * 1000
const TOKEN_EXPIRY_HOURS = 24

/**
 * Returns the number of seconds the user must wait before making another
 * email change request, or null if no rate limit applies.
 */
export function checkEmailChangeRateLimit(
  lastRequestAt: Date | null,
  now: Date,
): number | null {
  if (!lastRequestAt) return null
  const timeSinceMs = now.getTime() - lastRequestAt.getTime()
  if (timeSinceMs >= RATE_LIMIT_MS) return null
  return Math.ceil((RATE_LIMIT_MS - timeSinceMs) / 1000)
}

/**
 * Generates a secure random token and its SHA-256 hash.
 * Returns the raw token (for email verification link) and the hash (for DB storage).
 */
export function generateEmailChangeToken(): {
  token: string
  tokenHash: string
} {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  return { token, tokenHash }
}

/**
 * Calculates the expiration date for an email change token.
 */
export function calculateTokenExpiry(): Date {
  return new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
}
