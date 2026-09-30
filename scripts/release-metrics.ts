// fallow-ignore-file unused-file -- invoked directly by production-release.yml

import { fetchWithTimeout } from './http'
import {
  parseVersionMetrics,
  validateExternalHttpsResponse,
  validateExternalHttpsUrl,
  validateMetricsWindow,
} from './release-policy.domain'

const metricsUrl = requiredEnv('CLOUDFLARE_VERSION_METRICS_URL')
const versionId = requiredEnv('CLOUDFLARE_VERSION_ID')
const workerName = requiredEnv('WORKER_NAME')
const since = requiredEnv('CLOUDFLARE_METRICS_SINCE')
const until = requiredEnv('CLOUDFLARE_METRICS_UNTIL')

const url = validateExternalHttpsUrl(
  metricsUrl,
  'CLOUDFLARE_VERSION_METRICS_URL',
)
url.searchParams.set('version_id', versionId)
url.searchParams.set('since', since)
url.searchParams.set('until', until)

const response = await fetchWithTimeout(url, {
  redirect: 'manual',
  headers: {
    authorization: `Bearer ${requiredEnv('CLOUDFLARE_VERSION_METRICS_TOKEN')}`,
    accept: 'application/json',
    'Cloudflare-Workers-Version-Overrides': `${workerName}="${versionId}"`,
    'Cloudflare-Workers-Version-Key': `dina-release-metrics-${versionId}`,
  },
})
validateExternalHttpsResponse(response, url, 'CLOUDFLARE_VERSION_METRICS_URL')
if (!response.ok) {
  throw new Error(`Version metrics endpoint returned HTTP ${response.status}`)
}

const responseBody = await response.json()
validateMetricsWindow(responseBody, since, until)
const metrics = parseVersionMetrics(responseBody)
console.log(JSON.stringify(metrics))

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}
