const PRIVATE_IMAGE_PATH =
  /^\/storage\/v1\/object\/sign\/(?:avatars|course-thumbnails|media-thumbnails)\/.+/
const REFRESH_SKEW_MS = 60_000

type CacheEntry = {
  url: string
  expiresAt: number
}

const privateImageUrls = new Map<string, CacheEntry>()
let authenticatedUserId: string | null | undefined

function getTokenExpiry(url: URL): number | null {
  const token = url.searchParams.get('token')
  if (!token) return null

  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(normalized)) as { exp?: unknown }
    return typeof claims.exp === 'number' ? claims.exp * 1000 : null
  } catch {
    return null
  }
}

export function getPrivateImageCacheKey(
  value: string | null | undefined,
): string | null {
  if (!value) return null

  try {
    const url = new URL(value)
    return PRIVATE_IMAGE_PATH.test(url.pathname) ? url.pathname : null
  } catch {
    return null
  }
}

export function resolveSessionPrivateImageUrl(
  value: string | null | undefined,
  now = Date.now(),
): string | null | undefined {
  const key = getPrivateImageCacheKey(value)
  if (!key || !value) return value

  const cached = privateImageUrls.get(key)
  if (cached && cached.expiresAt - now > REFRESH_SKEW_MS) return cached.url

  privateImageUrls.delete(key)
  const expiresAt = getTokenExpiry(new URL(value))
  if (expiresAt && expiresAt - now > REFRESH_SKEW_MS) {
    privateImageUrls.set(key, { url: value, expiresAt })
  }
  return value
}

export function resetSessionPrivateImageUrlCache(): void {
  privateImageUrls.clear()
}

export function setSessionPrivateImageCacheUser(
  userId: string | null | undefined,
): void {
  if (authenticatedUserId !== userId) {
    resetSessionPrivateImageUrlCache()
    authenticatedUserId = userId
  }
}
