// fallow-ignore-file unused-file -- invoked directly by release workflows

import { fetchWithTimeout } from './http'
import {
  resolveHealthSmokeUrl,
  validateSmokeResponseOrigin,
} from './health-smoke.domain'
import {
  resolveHealthSmokeHeaders,
  resolveSmokeAccessHeaders,
} from './health-smoke.version.domain'
import {
  extractFirstPartyAssetUrls,
  parseJourneyPaths,
} from './release-journey-smoke.domain'

const origin = resolveHealthSmokeUrl(requiredEnv('SMOKE_BASE_URL'))
const versionOverrideId = optionalEnv('SMOKE_VERSION_ID')
const workerName = optionalEnv('SMOKE_WORKER_NAME')
const expectedVersionId =
  optionalEnv('SMOKE_EXPECTED_VERSION_ID') ?? versionOverrideId
if (!expectedVersionId) {
  throw new Error('SMOKE_EXPECTED_VERSION_ID or SMOKE_VERSION_ID is required')
}
const expectedRelease = requiredEnv('SMOKE_EXPECTED_RELEASE')
const paths = parseJourneyPaths(requiredEnv('SMOKE_JOURNEY_PATHS'))
const versionSmokeHeaders = {
  ...resolveHealthSmokeHeaders(versionOverrideId, workerName),
  ...resolveSmokeAccessHeaders(
    optionalEnv('PREPRODUCTION_ACCESS_CLIENT_ID'),
    optionalEnv('PREPRODUCTION_ACCESS_CLIENT_SECRET'),
  ),
}

for (const path of paths) {
  const url = new URL(path, origin)
  const response = await fetchWithTimeout(url, {
    headers: versionSmokeHeaders,
    redirect: 'manual',
  })
  const originFailure = validateSmokeResponseOrigin(response, url)
  if (originFailure) throw new Error(`${path}: ${originFailure}`)
  if (response.status !== 200) {
    throw new Error(`${path}: expected HTTP 200, received ${response.status}`)
  }
  if (response.headers.get('x-dina-worker-version') !== expectedVersionId) {
    throw new Error(`${path}: response was not served by ${expectedVersionId}`)
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
      headers: versionSmokeHeaders,
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
    if (
      assetResponse.headers.get('x-dina-worker-version') !== expectedVersionId
    ) {
      throw new Error(
        `${assetUrl.pathname}: asset was not served by ${expectedVersionId}`,
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
  const value = optionalEnv(name)
  if (!value) throw new Error(`${name} is required`)
  return value
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

export {}
