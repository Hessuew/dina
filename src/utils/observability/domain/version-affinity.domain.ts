export const VERSION_AFFINITY_COOKIE_NAME = 'dina-version-key'
export const VERSION_AFFINITY_COOKIE_MAX_AGE_SECONDS = 31_536_000

const COOKIE_OCTET_VALUE_PATTERN =
  /^[\u0021\u0023-\u002B\u002D-\u003A\u003C-\u005B\u005D-\u007E]+$/u

export function hasVersionAffinityCookie(
  cookieHeader?: string | null,
): boolean {
  const cookiePrefix = `${VERSION_AFFINITY_COOKIE_NAME}=`
  const firstCookie = cookieHeader
    ?.split(';')
    .find((cookie) => cookie.trimStart().startsWith(cookiePrefix))
  if (!firstCookie) return false
  const value = firstCookie.trimStart()
  const cookieValue = value.slice(cookiePrefix.length)
  return COOKIE_OCTET_VALUE_PATTERN.test(cookieValue)
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
