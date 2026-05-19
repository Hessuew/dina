const RATE_LIMIT_MS = 60 * 1000

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
