// fallow-ignore-file unused-file -- invoked directly by production-release.yml

import { fetchWithTimeout } from './http'
import { validateExternalHttpsUrl } from './release-policy.domain'

const evidenceUrl = requiredEnv('PRODUCTION_RELEASE_EVIDENCE_URL')
const releaseTag = requiredEnv('RELEASE_TAG')
const targetSha = requiredEnv('TARGET_SHA')
const cloudflareVersionId = requiredEnv('CLOUDFLARE_VERSION_ID')
const origin = requiredEnv('PRODUCTION_ORIGIN')

const url = validateExternalHttpsUrl(
  evidenceUrl,
  'PRODUCTION_RELEASE_EVIDENCE_URL',
)
url.searchParams.set('release_tag', releaseTag)
url.searchParams.set('target_sha', targetSha)
url.searchParams.set('cloudflare_version_id', cloudflareVersionId)
url.searchParams.set('origin', origin)

const response = await fetchWithTimeout(url, {
  headers: {
    authorization: `Bearer ${requiredEnv('PRODUCTION_RELEASE_EVIDENCE_TOKEN')}`,
    accept: 'application/json',
  },
})
if (!response.ok) {
  throw new Error(`Release evidence endpoint returned HTTP ${response.status}`)
}

const evidence = await response.json()
assertEvidence(evidence)
console.log(`release evidence passed: ${releaseTag}`)

function assertEvidence(value: unknown): asserts value is ReleaseEvidence {
  if (!isRecord(value)) throw new Error('Release evidence must be an object')
  const failure = [
    validateReleaseIdentity(value),
    validateSourceMaps(value),
    validateAlertRouting(value),
  ].find(Boolean)
  if (failure) throw new Error(failure)
}

function validateReleaseIdentity(
  value: Record<string, unknown>,
): string | null {
  const fields: Array<[string, unknown, string]> = [
    ['tag', value.releaseTag, releaseTag],
    ['SHA', value.targetSha, targetSha],
    ['version', value.cloudflareVersionId, cloudflareVersionId],
    ['origin', value.origin, origin],
  ]
  const fieldFailure = fields.find(
    ([, actual, expected]) => actual !== expected,
  )
  if (fieldFailure) {
    return `Release evidence ${fieldFailure[0]} did not match the promoted release`
  }
  return null
}

function validateSourceMaps(value: Record<string, unknown>): string | null {
  if (value.sourceMapsCorrelated !== true) {
    return 'Release evidence did not confirm source-map correlation'
  }
  return null
}

function validateAlertRouting(value: Record<string, unknown>): string | null {
  const alerts = value.alerts
  if (!isRecord(alerts)) {
    return 'Release evidence did not include alert routing evidence'
  }
  const missingChannel = ['slackIncidents', 'emailFallback'].find(
    (channel) => alerts[channel] !== true,
  )
  if (missingChannel) {
    return `Release evidence did not confirm ${missingChannel} delivery`
  }
  return null
}

type ReleaseEvidence = {
  releaseTag: string
  targetSha: string
  cloudflareVersionId: string
  origin: string
  sourceMapsCorrelated: true
  alerts: {
    slackIncidents: true
    emailFallback: true
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export {}
