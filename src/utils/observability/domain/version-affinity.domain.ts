export const VERSION_AFFINITY_COOKIE_NAME = 'dina-version-key'
export const VERSION_AFFINITY_COOKIE_MAX_AGE_SECONDS = 31_536_000

export function hasVersionAffinityCookie(
  cookieHeader?: string | null,
): boolean {
  return (
    cookieHeader
      ?.split(';')
      .some((cookie) =>
        cookie.trim().startsWith(`${VERSION_AFFINITY_COOKIE_NAME}=`),
      ) ?? false
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
