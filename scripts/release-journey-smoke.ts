// fallow-ignore-file unused-file -- invoked directly by production-release.yml

const origin = requiredEnv('PRODUCTION_ORIGIN').replace(/\/$/u, '')
const versionId = requiredEnv('SMOKE_VERSION_ID')
const workerName = requiredEnv('SMOKE_WORKER_NAME')
const expectedRelease = requiredEnv('SMOKE_EXPECTED_RELEASE')
const paths = (process.env.PRODUCTION_JOURNEY_PATHS ?? '/login')
  .split(',')
  .map((path) => path.trim())
  .filter(Boolean)

for (const path of paths) {
  const url = new URL(path, `${origin}/`)
  const response = await fetch(url, {
    headers: versionHeaders(workerName, versionId),
  })
  if (response.status !== 200) {
    throw new Error(`${path}: expected HTTP 200, received ${response.status}`)
  }
  if (response.headers.get('x-dina-worker-version') !== versionId) {
    throw new Error(`${path}: response was not served by ${versionId}`)
  }

  if (response.headers.get('x-dina-worker-version-tag') !== expectedRelease) {
    throw new Error(
      `${path}: response did not report release ${expectedRelease}`,
    )
  }
  const assetUrls = extractFirstPartyAssetUrls(url, await response.text())
  if (assetUrls.length === 0) {
    throw new Error(`${path}: no first-party hashed asset references found`)
  }
  for (const assetUrl of assetUrls.slice(0, 3)) {
    const assetResponse = await fetch(assetUrl, {
      headers: versionHeaders(workerName, versionId),
    })
    if (assetResponse.status !== 200) {
      throw new Error(
        `${assetUrl.pathname}: expected HTTP 200, received ${assetResponse.status}`,
      )
    }
    if (assetResponse.headers.get('x-dina-worker-version') !== versionId) {
      throw new Error(
        `${assetUrl.pathname}: asset was not served by ${versionId}`,
      )
    }
    if (
      assetResponse.headers.get('x-dina-worker-version-tag') !== expectedRelease
    ) {
      throw new Error(
        `${assetUrl.pathname}: asset did not report release ${expectedRelease}`,
      )
    }
  }
  console.log(`journey smoke passed: ${path}`)
}

function versionHeaders(
  smokeWorkerName: string,
  smokeVersionId: string,
): Record<string, string> {
  return {
    'Cloudflare-Workers-Version-Overrides': `${smokeWorkerName}="${smokeVersionId}"`,
    'Cloudflare-Workers-Version-Key': `dina-release-smoke-${smokeVersionId}`,
  }
}

function extractFirstPartyAssetUrls(pageUrl: URL, html: string): Array<URL> {
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

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

export {}
