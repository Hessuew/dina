const METRICS_PATH = '/_internal/release/metrics'
const EVIDENCE_PATH = '/_internal/release/evidence'
const DATASET_NAME = 'dina_release_metrics'

export type ReleaseVersionMetadata = {
  id: string
  tag: string
  timestamp: string
}

type MetricsDataset = {
  writeDataPoint: (event: {
    indexes?: Array<string>
    blobs?: Array<string>
    doubles?: Array<number>
  }) => void
}

export type ReleaseRuntimeEnv = {
  RELEASE_METRICS?: MetricsDataset
  RELEASE_METRICS_TOKEN?: string
  RELEASE_EVIDENCE_TOKEN?: string
  RELEASE_METRICS_DATASET?: string
  RELEASE_SHA?: string
  RELEASE_ORIGIN?: string
  RELEASE_SOURCE_MAPS_VERIFIED?: string
  RELEASE_ALERTS_SLACK_INCIDENTS?: string
  RELEASE_ALERTS_EMAIL_FALLBACK?: string
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_ANALYTICS_TOKEN?: string
  BETTER_STACK_TELEMETRY_TOKEN?: string
  BETTER_STACK_APPLICATION_ID?: string
}

type MetricsWindow = {
  versionId: string
  since: string
  until: string
}

type ReleaseMetrics = {
  requests: number
  errors: number
  p95LatencyMs: number
  highSeverityIssues: number
}

export async function handleReleaseEndpoint(
  request: Request,
  runtime: ReleaseRuntimeEnv,
  metadata: ReleaseVersionMetadata | null,
): Promise<Response | null> {
  const pathname = new URL(request.url).pathname
  if (pathname === METRICS_PATH) {
    return handleMetricsRequest(request, runtime, metadata)
  }
  if (pathname === EVIDENCE_PATH) {
    return handleEvidenceRequest(request, runtime, metadata)
  }
  return null
}

export function recordReleaseMetric(
  runtime: ReleaseRuntimeEnv,
  metadata: ReleaseVersionMetadata | null,
  request: Request,
  response: Response,
  durationMs: number,
): void {
  if (!shouldRecordMetric(runtime, metadata, request)) return
  if (!metadata) return

  const unexpectedError = response.status >= 500 ? 1 : 0
  runtime.RELEASE_METRICS?.writeDataPoint({
    indexes: [metadata.id],
    blobs: [metadata.tag, request.method, new URL(request.url).pathname],
    doubles: [1, unexpectedError, unexpectedError, durationMs],
  })
}

function shouldRecordMetric(
  runtime: ReleaseRuntimeEnv,
  metadata: ReleaseVersionMetadata | null,
  request: Request,
): boolean {
  return Boolean(
    runtime.RELEASE_METRICS &&
    metadata &&
    !new URL(request.url).pathname.startsWith('/_internal/'),
  )
}

async function handleMetricsRequest(
  request: Request,
  runtime: ReleaseRuntimeEnv,
  metadata: ReleaseVersionMetadata | null,
): Promise<Response> {
  const window = resolveMetricsRequest(request, runtime, metadata)
  if (window instanceof Response) return window

  const metrics = await queryReleaseMetrics(runtime, window)
  return metrics
    ? jsonResponse(metrics, 200)
    : jsonResponse({ error: 'metrics are not queryable' }, 503)
}

// fallow-ignore-next-line complexity -- each fail-closed response is a distinct adapter guard
function resolveMetricsRequest(
  request: Request,
  runtime: ReleaseRuntimeEnv,
  metadata: ReleaseVersionMetadata | null,
): MetricsWindow | Response {
  if (!hasBearerToken(request, runtime.RELEASE_METRICS_TOKEN)) {
    return jsonResponse({ error: 'unauthorized' }, 401)
  }
  const window = readMetricsWindow(new URL(request.url).searchParams)
  if (!window) return jsonResponse({ error: 'invalid metrics window' }, 400)
  if (!metadata || window.versionId !== metadata.id) {
    return jsonResponse({ error: 'version does not match this Worker' }, 409)
  }
  return window
}

async function handleEvidenceRequest(
  request: Request,
  runtime: ReleaseRuntimeEnv,
  metadata: ReleaseVersionMetadata | null,
): Promise<Response> {
  const identity = resolveEvidenceIdentity(request)
  const identityFailure = validateEvidenceIdentity(
    request,
    runtime,
    metadata,
    identity,
  )
  if (identityFailure) return identityFailure
  if (!identity)
    return jsonResponse({ error: 'release identity is incomplete' }, 400)

  const releaseRegistered = await hasReportedBetterStackRelease(
    runtime,
    identity.releaseTag,
  )
  if (!releaseRegistered) {
    return jsonResponse({ error: 'Better Stack release was not verified' }, 503)
  }

  return jsonResponse(
    {
      releaseTag: identity.releaseTag,
      targetSha: identity.targetSha,
      cloudflareVersionId: identity.versionId,
      origin: identity.origin,
      sourceMapsCorrelated: runtime.RELEASE_SOURCE_MAPS_VERIFIED === 'true',
      alerts: {
        slackIncidents: runtime.RELEASE_ALERTS_SLACK_INCIDENTS === 'true',
        emailFallback: runtime.RELEASE_ALERTS_EMAIL_FALLBACK === 'true',
      },
    },
    200,
  )
}

type EvidenceIdentity = {
  releaseTag: string
  targetSha: string
  versionId: string
  origin: string
}

// fallow-ignore-next-line complexity -- four required release identity fields are validated together
function resolveEvidenceIdentity(request: Request): EvidenceIdentity | null {
  const query = new URL(request.url).searchParams
  const releaseTag = query.get('release_tag')?.trim()
  const targetSha = query.get('target_sha')?.trim()
  const versionId = query.get('cloudflare_version_id')?.trim()
  const origin = query.get('origin')?.trim()
  if (!releaseTag || !targetSha || !versionId || !origin) return null
  return { releaseTag, targetSha, versionId, origin }
}

// fallow-ignore-next-line complexity -- protected release evidence must reject every identity mismatch
function validateEvidenceIdentity(
  request: Request,
  runtime: ReleaseRuntimeEnv,
  metadata: ReleaseVersionMetadata | null,
  identity: EvidenceIdentity | null,
): Response | null {
  if (!hasBearerToken(request, runtime.RELEASE_EVIDENCE_TOKEN)) {
    return jsonResponse({ error: 'unauthorized' }, 401)
  }
  if (!identity) return null
  if (
    !metadata ||
    identity.versionId !== metadata.id ||
    identity.releaseTag !== metadata.tag
  ) {
    return jsonResponse(
      { error: 'release identity does not match Worker' },
      409,
    )
  }
  if (
    identity.targetSha !== runtime.RELEASE_SHA ||
    identity.origin !== runtime.RELEASE_ORIGIN
  ) {
    return jsonResponse({ error: 'release identity does not match build' }, 409)
  }
  return null
}

function hasBearerToken(
  request: Request,
  expected: string | undefined,
): boolean {
  const authorization = request.headers.get('authorization')
  return Boolean(expected && authorization === `Bearer ${expected}`)
}

function readMetricsWindow(params: URLSearchParams): MetricsWindow | null {
  const versionId = params.get('version_id')?.trim()
  if (!versionId || !/^[A-Za-z0-9._-]+$/u.test(versionId)) return null
  const timeWindow = resolveTimeWindow(params)
  return timeWindow ? { versionId, ...timeWindow } : null
}

function resolveTimeWindow(
  params: URLSearchParams,
): Pick<MetricsWindow, 'since' | 'until'> | null {
  const since = readIsoTimestamp(params.get('since'))
  const until = readIsoTimestamp(params.get('until'))
  if (!since || !until) return null
  return Date.parse(since) < Date.parse(until) ? { since, until } : null
}

function readIsoTimestamp(value: string | null): string | null {
  if (!value) return null
  const timestamp = new Date(value)
  return Number.isNaN(timestamp.valueOf()) ? null : timestamp.toISOString()
}

async function queryReleaseMetrics(
  runtime: ReleaseRuntimeEnv,
  window: MetricsWindow,
): Promise<ReleaseMetrics | null> {
  const credentials = resolveAnalyticsCredentials(runtime)
  if (!credentials) return null

  const dataset = runtime.RELEASE_METRICS_DATASET?.trim() || DATASET_NAME
  const query = buildMetricsQuery(dataset, window)
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/analytics_engine/sql`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${credentials.token}`,
        'content-type': 'text/plain',
      },
      body: query,
    },
  )
  if (!response.ok) return null
  return parseMetricsResponse(await response.json())
}

function resolveAnalyticsCredentials(
  runtime: ReleaseRuntimeEnv,
): { accountId: string; token: string } | null {
  const accountId = runtime.CLOUDFLARE_ACCOUNT_ID?.trim()
  const token = runtime.CLOUDFLARE_ANALYTICS_TOKEN?.trim()
  return accountId && token ? { accountId, token } : null
}

function buildMetricsQuery(dataset: string, window: MetricsWindow): string {
  const safeDataset = /^[A-Za-z0-9_]+$/u.test(dataset) ? dataset : DATASET_NAME
  const version = escapeSql(window.versionId)
  return [
    'SELECT',
    'SUM(_sample_interval * double1) AS requests,',
    'SUM(_sample_interval * double2) AS errors,',
    'quantileExactWeighted(0.95)(double4, _sample_interval) AS p95LatencyMs,',
    'SUM(_sample_interval * double3) AS highSeverityIssues',
    `FROM ${safeDataset}`,
    `WHERE index1 = '${version}'`,
    `AND timestamp >= toDateTime('${window.since}')`,
    `AND timestamp < toDateTime('${window.until}')`,
    'FORMAT JSON',
  ].join(' ')
}

function parseMetricsResponse(value: unknown): ReleaseMetrics | null {
  const row = firstMetricsRow(value)
  if (!row) return null
  const metrics = {
    requests: readMetric(row.requests),
    errors: readMetric(row.errors),
    p95LatencyMs: readMetric(row.p95LatencyMs),
    highSeverityIssues: readMetric(row.highSeverityIssues),
  }
  return Object.values(metrics).every(Number.isFinite) ? metrics : null
}

function firstMetricsRow(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value) || !Array.isArray(value.data)) return null
  const row = value.data[0]
  return isRecord(row) ? row : null
}

function readMetric(value: unknown): number {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

async function hasReportedBetterStackRelease(
  runtime: ReleaseRuntimeEnv,
  releaseTag: string,
): Promise<boolean> {
  const token = runtime.BETTER_STACK_TELEMETRY_TOKEN?.trim()
  const applicationId = runtime.BETTER_STACK_APPLICATION_ID?.trim()
  if (!token || !applicationId) return false

  const url = new URL('https://errors.betterstack.com/api/v1/releases')
  url.searchParams.set('application_id', applicationId)
  url.searchParams.set('version', releaseTag)
  url.searchParams.set('environment', 'production')
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  })
  if (!response.ok) return false
  const body = await response.json()
  return isReportedRelease(body, releaseTag, applicationId)
}

function isReportedRelease(
  value: unknown,
  releaseTag: string,
  applicationId: string,
): boolean {
  if (!isRecord(value) || !Array.isArray(value.data)) return false
  return value.data.some((item) =>
    matchesReportedRelease(item, releaseTag, applicationId),
  )
}

// fallow-ignore-next-line complexity -- provider response schema and release identity are fail-closed
function matchesReportedRelease(
  item: unknown,
  releaseTag: string,
  applicationId: string,
): boolean {
  if (!isRecord(item) || !isRecord(item.attributes)) return false
  const attributes = item.attributes
  const environments = attributes.environments
  return Boolean(
    attributes.version === releaseTag &&
    String(attributes.application_id) === applicationId &&
    Array.isArray(environments) &&
    environments.includes('production') &&
    attributes.origin === 'reported',
  )
}

function escapeSql(value: string): string {
  return value.replaceAll("'", "''")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function jsonResponse(value: unknown, status: number): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    },
  })
}
