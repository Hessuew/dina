export const VERSION_AFFINITY_COOKIE_NAME = 'dina-version-key'
export const VERSION_AFFINITY_COOKIE_MAX_AGE_SECONDS = 31_536_000

export function hasVersionAffinityCookie(
  cookieHeader?: string | null,
): boolean {
  const cookiePrefix = `${VERSION_AFFINITY_COOKIE_NAME}=`
  return (
    cookieHeader?.split(';').some((cookie) => {
      const value = cookie.trim()
      if (!value.startsWith(cookiePrefix)) return false
      const cookieValue = value.slice(cookiePrefix.length)
      return cookieValue.length > 0 && !/[\s;]/u.test(cookieValue)
    }) ?? false
  )
}

export function buildVersionAffinityCookie(value: string): string {
  return [
    `${VERSION_AFFINITY_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${VERSION_AFFINITY_COOKIE_MAX_AGE_SECONDS}`,
  ].join('; ')
}
