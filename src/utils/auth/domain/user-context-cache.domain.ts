/**
 * Pure decision logic for the client-side root user-context cache.
 * The root route keeps the mutable entry; this module decides hits/misses.
 */
export type UserContextCacheEntry<T> = {
  user: T
  fetchedAt: number
}

export type UserContextCacheRead<T> = { hit: true; user: T } | { hit: false }

export function readUserContextCache<T>(
  entry: UserContextCacheEntry<T> | undefined,
  now: number,
  ttlMs: number,
): UserContextCacheRead<T> {
  if (!entry || now - entry.fetchedAt >= ttlMs) return { hit: false }
  return { hit: true, user: entry.user }
}
