const RELEASE_TAG_DATE_PATTERN = /^v(\d{4}\.\d{2}\.\d{2})\.(\d+)$/u

const GRADUAL_ROLLOUT_PERCENTAGES = [10, 25, 50, 100] as const
const MINIMUM_GRADUAL_REQUESTS = 20
export const MIN_ROLLOUT_STAGE_WAIT_SECONDS = 600
export const MAX_ROLLOUT_STAGE_WAIT_SECONDS = 900
const MAX_ERROR_RATE = 0.05
const MAX_P95_LATENCY_MS = 1000

export type RolloutProfile = 'standard' | 'gradual'

export type RolloutPlan =
  | {
      mode: 'direct'
      reason: 'standard' | 'low-traffic'
      percentages: readonly [100]
    }
  | {
      mode: 'gradual'
      reason: 'requested'
      percentages: readonly [10, 25, 50, 100]
    }

export type VersionMetrics = {
  requests: number
  errors: number
  p95LatencyMs: number
  highSeverityIssues: number
}

export type GuardrailResult = {
  passed: boolean
  errorRate: number
  failures: Array<string>
}

export function validateRolloutStageWaitSeconds(value: string): number {
  const normalized = value.trim()
  if (!/^\d+$/u.test(normalized)) {
    throw new Error('ROLLOUT_STAGE_WAIT_SECONDS must be an integer')
  }
  const seconds = Number(normalized)
  if (
    !Number.isSafeInteger(seconds) ||
    seconds < MIN_ROLLOUT_STAGE_WAIT_SECONDS ||
    seconds > MAX_ROLLOUT_STAGE_WAIT_SECONDS
  ) {
    throw new Error(
      `ROLLOUT_STAGE_WAIT_SECONDS must be between ${MIN_ROLLOUT_STAGE_WAIT_SECONDS} and ${MAX_ROLLOUT_STAGE_WAIT_SECONDS} seconds`,
    )
  }
  return seconds
}

export function createReleaseTag(
  utcDate: string,
  existingTags: ReadonlyArray<string>,
): string {
  if (!/^\d{4}\.\d{2}\.\d{2}$/u.test(utcDate)) {
    throw new Error(`Invalid UTC release date: ${utcDate}`)
  }

  const nextSequence =
    existingTags.reduce((highest, tag) => {
      const match = RELEASE_TAG_DATE_PATTERN.exec(tag)
      if (!match || match[1] !== utcDate) return highest
      return Math.max(highest, Number(match[2]))
    }, 0) + 1

  return `v${utcDate}.${nextSequence}`
}

export function validateTargetSha(value: string): string {
  const targetSha = value.trim().toLowerCase()
  if (!/^[0-9a-f]{40}$/u.test(targetSha)) {
    throw new Error('target_sha must be a full 40-character commit SHA')
  }
  return targetSha
}

export function selectRolloutPlan(
  profile: RolloutProfile,
  newVersionRequests?: number,
): RolloutPlan {
  if (profile === 'standard') {
    return { mode: 'direct', reason: 'standard', percentages: [100] }
  }

  if (
    newVersionRequests !== undefined &&
    newVersionRequests < MINIMUM_GRADUAL_REQUESTS
  ) {
    return { mode: 'direct', reason: 'low-traffic', percentages: [100] }
  }

  return {
    mode: 'gradual',
    reason: 'requested',
    percentages: GRADUAL_ROLLOUT_PERCENTAGES,
  }
}

export function evaluateGuardrails(metrics: VersionMetrics): GuardrailResult {
  const errorRate =
    metrics.requests === 0 ? 0 : metrics.errors / metrics.requests
  const failures: Array<string> = []

  if (errorRate > MAX_ERROR_RATE) {
    failures.push(`error rate ${formatPercent(errorRate)} exceeds 5%`)
  }
  if (metrics.p95LatencyMs > MAX_P95_LATENCY_MS) {
    failures.push(`p95 latency ${metrics.p95LatencyMs}ms exceeds 1000ms`)
  }
  if (metrics.highSeverityIssues > 0) {
    failures.push(
      `${metrics.highSeverityIssues} new high-severity release-correlated issue(s) detected`,
    )
  }

  return { passed: failures.length === 0, errorRate, failures }
}

export function parseVersionMetrics(value: unknown): VersionMetrics {
  if (!isRecord(value))
    throw new Error('Version metrics response must be an object')

  const candidate = isRecord(value.metrics) ? value.metrics : value
  const requests = readNonNegativeNumber(candidate.requests, 'requests')
  const errors = readNonNegativeNumber(candidate.errors, 'errors')
  const p95LatencyMs = readNonNegativeNumber(
    candidate.p95LatencyMs,
    'p95LatencyMs',
  )
  const highSeverityIssues = readNonNegativeNumber(
    candidate.highSeverityIssues,
    'highSeverityIssues',
  )

  if (errors > requests)
    throw new Error('Version metrics errors cannot exceed requests')

  return { requests, errors, p95LatencyMs, highSeverityIssues }
}

function readNonNegativeNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Version metrics ${name} must be a non-negative number`)
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}
