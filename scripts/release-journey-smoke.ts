// fallow-ignore-file unused-file -- invoked directly by production-release.yml

import { fetchWithTimeout } from './http'
import {
  resolveHealthSmokeUrl,
  validateSmokeResponseOrigin,
} from './health-smoke.domain'
import {
  extractFirstPartyAssetUrls,
  parseJourneyPaths,
  versionHeaders,
} from './release-journey-smoke.domain'

const origin = resolveHealthSmokeUrl(requiredEnv('PRODUCTION_ORIGIN'))
const versionId = requiredEnv('SMOKE_VERSION_ID')
const workerName = requiredEnv('SMOKE_WORKER_NAME')
const expectedRelease = requiredEnv('SMOKE_EXPECTED_RELEASE')
const paths = parseJourneyPaths(requiredEnv('PRODUCTION_JOURNEY_PATHS'))

for (const path of paths) {
  const url = new URL(path, origin)
  const response = await fetchWithTimeout(url, {
    headers: versionHeaders(workerName, versionId),
    redirect: 'manual',
  })
  const originFailure = validateSmokeResponseOrigin(response, url)
  if (originFailure) throw new Error(`${path}: ${originFailure}`)
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
    const assetResponse = await fetchWithTimeout(assetUrl, {
      headers: versionHeaders(workerName, versionId),
      redirect: 'manual',
    })
    const assetOriginFailure = validateSmokeResponseOrigin(
      assetResponse,
      assetUrl,
    )
    if (assetOriginFailure) {
      throw new Error(`${assetUrl.pathname}: ${assetOriginFailure}`)
    }
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

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

export {}
