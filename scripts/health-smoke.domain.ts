export const HEALTH_SMOKE_PATHS = ['/healthz', '/readyz'] as const

export type HealthSmokePath = (typeof HEALTH_SMOKE_PATHS)[number]

export type HealthSmokeHeaders = Record<string, string>

type HealthPayload = {
  status?: unknown
  service?: unknown
  requestId?: unknown
  dependencies?: {
    database?: {
      status?: unknown
    }
  }
}

export function resolveHealthSmokeUrl(value: string | undefined): URL {
  const raw = value?.trim()
  if (!raw) throw new Error('SMOKE_BASE_URL or a base URL argument is required')

  const url = new URL(raw)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Smoke base URL must use http or https')
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      'Smoke base URL must not contain credentials, query, or hash',
    )
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    throw new Error('Smoke base URL must point to the deployment origin')
  }

  return url
}

export function validateHealthSmokeResponse(
  path: HealthSmokePath,
  statusCode: number,
  payload: unknown,
): string | null {
  if (statusCode !== 200) return `expected HTTP 200, received ${statusCode}`
  if (!isHealthPayload(payload)) return 'response was not a health payload'

  return (
    [
      payload.status === 'ok' ? null : 'response status was not ok',
      payload.service === 'christ-dina'
        ? null
        : 'response service was not christ-dina',
      typeof payload.requestId === 'string' && payload.requestId.trim()
        ? null
        : 'response did not include a requestId',
      path === '/readyz' && payload.dependencies?.database?.status !== 'ok'
        ? 'database readiness was not ok'
        : null,
    ].find(Boolean) ?? null
  )
}

export function resolveHealthSmokeHeaders(
  versionId: string | undefined,
  workerName: string | undefined,
): HealthSmokeHeaders {
  const normalizedVersionId = versionId?.trim()
  const normalizedWorkerName = workerName?.trim()
  if (!normalizedVersionId && !normalizedWorkerName) return {}
  if (!normalizedVersionId || !normalizedWorkerName) {
    throw new Error(
      'SMOKE_VERSION_ID and SMOKE_WORKER_NAME must be supplied together',
    )
  }

  return {
    'Cloudflare-Workers-Version-Overrides': `${normalizedWorkerName}="${normalizedVersionId}"`,
    'Cloudflare-Workers-Version-Key': `dina-release-smoke-${normalizedVersionId}`,
  }
}

export function validateVersionMetadataHeader(
  expectedVersionId: string | undefined,
  actualVersionId: string | null,
): string | null {
  const expected = expectedVersionId?.trim()
  if (!expected) return null
  if (actualVersionId !== expected) {
    return `response ran version ${actualVersionId ?? 'unknown'}, expected ${expected}`
  }
  return null
}

export function validateVersionMetadataTag(
  expectedRelease: string | undefined,
  actualRelease: string | null,
): string | null {
  const expected = expectedRelease?.trim()
  if (!expected) return null
  if (actualRelease !== expected) {
    return `response ran release ${actualRelease ?? 'unknown'}, expected ${expected}`
  }
  return null
}

function isHealthPayload(value: unknown): value is HealthPayload {
  return typeof value === 'object' && value !== null
}
