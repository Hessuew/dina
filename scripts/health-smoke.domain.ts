export const HEALTH_SMOKE_PATHS = ['/healthz', '/readyz'] as const

export type HealthSmokePath = (typeof HEALTH_SMOKE_PATHS)[number]

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
  if (url.protocol !== 'https:') {
    throw new Error('Smoke base URL must use HTTPS')
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

export function validateSmokeResponseOrigin(
  response: Pick<Response, 'redirected' | 'status' | 'url'>,
  expectedUrl: URL,
): string | null {
  if (
    response.redirected ||
    (response.status >= 300 && response.status < 400)
  ) {
    return 'response was a redirect'
  }
  if (!response.url) return 'response did not include a URL'
  let actualUrl: URL
  try {
    actualUrl = new URL(response.url)
  } catch {
    return 'response URL was invalid'
  }
  if (actualUrl.origin !== expectedUrl.origin) {
    return `response origin ${actualUrl.origin} did not match ${expectedUrl.origin}`
  }
  return null
}

export function validateHealthSmokeResponse(
  path: HealthSmokePath,
  statusCode: number,
  payload: unknown,
): string | null {
  if (statusCode !== 200) return `expected HTTP 200, received ${statusCode}`
  if (!isHealthPayload(payload)) return 'response was not a health payload'
  if (payload.status !== 'ok') return 'response status was not ok'
  if (payload.service !== 'christ-dina') {
    return 'response service was not christ-dina'
  }
  if (typeof payload.requestId !== 'string' || !payload.requestId.trim()) {
    return 'response did not include a requestId'
  }
  if (path === '/readyz' && payload.dependencies?.database?.status !== 'ok') {
    return 'database readiness was not ok'
  }
  return null
}

function isHealthPayload(value: unknown): value is HealthPayload {
  return typeof value === 'object' && value !== null
}
