export function versionHeaders(
  workerName: string,
  versionId: string,
): Record<string, string> {
  return {
    'Cloudflare-Workers-Version-Overrides': `${workerName}="${versionId}"`,
    'Cloudflare-Workers-Version-Key': `dina-release-smoke-${versionId}`,
  }
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
}
