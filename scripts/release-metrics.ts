// fallow-ignore-file unused-file -- invoked directly by production-release.yml

import { parseVersionMetrics } from './release-policy.domain'

const metricsUrl = requiredEnv('CLOUDFLARE_VERSION_METRICS_URL')
const token = requiredEnv('CLOUDFLARE_VERSION_METRICS_TOKEN')
const versionId = requiredEnv('CLOUDFLARE_VERSION_ID')
const since = requiredEnv('CLOUDFLARE_METRICS_SINCE')
const until = requiredEnv('CLOUDFLARE_METRICS_UNTIL')

const url = new URL(metricsUrl)
url.searchParams.set('version_id', versionId)
url.searchParams.set('since', since)
url.searchParams.set('until', until)

const response = await fetch(url, {
  headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
})
if (!response.ok) {
  throw new Error(`Version metrics endpoint returned HTTP ${response.status}`)
}

const metrics = parseVersionMetrics(await response.json())
console.log(JSON.stringify(metrics))

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}
