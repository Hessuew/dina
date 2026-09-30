export const VERSION_AFFINITY_COOKIE_NAME = 'dina-version-key'
export const VERSION_AFFINITY_COOKIE_MAX_AGE_SECONDS = 31_536_000

const COOKIE_OCTET_VALUE_PATTERN =
  /^[\u0021\u0023-\u002B\u002D-\u003A\u003C-\u005B\u005D-\u007E]+$/u

export function hasVersionAffinityCookie(
  cookieHeader?: string | null,
): boolean {
  const cookiePrefix = `${VERSION_AFFINITY_COOKIE_NAME}=`
  return (
    cookieHeader?.split(';').some((cookie) => {
      const value = cookie.trimStart()
      if (!value.startsWith(cookiePrefix)) return false
      const cookieValue = value.slice(cookiePrefix.length)
      return COOKIE_OCTET_VALUE_PATTERN.test(cookieValue)
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
