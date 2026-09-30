export function versionHeaders(
  workerName: string,
  versionId: string,
): Record<string, string> {
  return {
    'Cloudflare-Workers-Version-Overrides': `${workerName}="${versionId}"`,
    'Cloudflare-Workers-Version-Key': `dina-release-smoke-${versionId}`,
  }
}

export function parseJourneyPaths(value: string): Array<string> {
  const paths = value
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean)
  if (paths.length === 0)
    throw new Error('At least one journey path is required')

  const origin = 'https://journey-path.invalid'
  for (const path of paths) {
    if (!path.startsWith('/') || path.startsWith('//')) {
      throw new Error(`Invalid journey path: ${path}`)
    }
    const url = new URL(path, origin)
    if (url.origin !== origin) throw new Error(`Invalid journey path: ${path}`)
  }
  return [...new Set(paths)]
}

export function extractFirstPartyAssetUrls(
  pageUrl: URL,
  html: string,
): Array<URL> {
  const candidates = [
    ...html.matchAll(
      /(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/gu,
    ),
  ]
  return candidates
    .map((match) => match[1])
    .filter((path): path is string => Boolean(path))
    .map((path) => new URL(path, pageUrl))
    .filter((assetUrl) => assetUrl.origin === pageUrl.origin)
    .filter((assetUrl) =>
      /\/[^/]+[-_][A-Za-z0-9_-]{8,}\.(?:js|css)$/u.test(assetUrl.pathname),
    )
}
