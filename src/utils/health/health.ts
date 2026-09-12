import { resolveObservabilityIdentity } from '@/utils/observability/domain/identity.domain'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, readRequestId } from '@/utils/observability/request-context'

export type HealthStatus = 'ok' | 'error'

export type DependencyResult = {
  status: HealthStatus
  durationMs: number
  error?: {
    category: 'database_unavailable'
    message: string
  }
}

export type HealthPayload = {
  status: HealthStatus
  service: string
  environment: string
  release: string | null
  requestId: string
  timestamp: string
  durationMs: number
}

export type ReadinessPayload = HealthPayload & {
  dependencies: {
    database: DependencyResult
  }
}

type RequestContext = {
  environment: string
  release: string | null
  requestId: string
  startedAt: number
  timestamp: string
  pathname: string
}

type DatabaseCheck = (signal?: AbortSignal) => Promise<void>

type HealthOptions = {
  checkDatabase?: DatabaseCheck
  /** Max wait for dependency checks. Default 2000ms. */
  checkTimeoutMs?: number
  environment?: string
  now?: () => Date
  release?: string | null
  requestId?: string
}

type HealthLogFields = {
  requestId: string
  path: string
  status: HealthStatus
  durationMs: number
  errorCategory?: string
}

const SERVICE_NAME = 'christ-dina'
const DEFAULT_CHECK_TIMEOUT_MS = 2000

export function isOperationalPath(pathname: string): boolean {
  return pathname === '/healthz' || pathname === '/readyz'
}

export function handleHealthRequest(
  request: Request,
  options: HealthOptions = {},
): Response {
  const context = buildRequestContext(request, options)
  const body = buildHealthPayload(context, 'ok')

  logServerEvent('info', 'health_check', buildLogFields(context, body.status))

  return jsonResponse(body, 200)
}

export async function handleReadinessRequest(
  request: Request,
  options: HealthOptions = {},
): Promise<Response> {
  const context = buildRequestContext(request, options)
  const database = await checkDependency(
    options.checkDatabase ?? noopCheck,
    options.checkTimeoutMs ?? DEFAULT_CHECK_TIMEOUT_MS,
  )
  const status = database.status
  const body = {
    ...buildHealthPayload(context, status),
    dependencies: { database },
  }

  logServerEvent(
    status === 'ok' ? 'info' : 'warn',
    'readiness_check',
    buildLogFields(context, status, database.error?.category),
  )

  return jsonResponse(body, status === 'ok' ? 200 : 503)
}

function buildRequestContext(
  request: Request,
  options: HealthOptions,
): RequestContext {
  const now = options.now?.() ?? new Date()
  const url = new URL(request.url)

  return {
    environment:
      options.environment ??
      resolveObservabilityIdentity(
        import.meta.env.MODE,
        import.meta.env.VITE_SENTRY_ENVIRONMENT,
      ).environment,
    release: options.release ?? readRelease(),
    requestId: options.requestId ?? readRequestId(request),
    startedAt: performance.now(),
    timestamp: now.toISOString(),
    pathname: url.pathname,
  }
}

function buildHealthPayload(
  context: RequestContext,
  status: HealthStatus,
): HealthPayload {
  return {
    status,
    service: SERVICE_NAME,
    environment: context.environment,
    release: context.release,
    requestId: context.requestId,
    timestamp: context.timestamp,
    durationMs: elapsedMs(context.startedAt),
  }
}

async function checkDependency(
  check: DatabaseCheck,
  timeoutMs: number,
): Promise<DependencyResult> {
  const startedAt = performance.now()
  const controller = new AbortController()

  try {
    await withTimeout(check(controller.signal), timeoutMs, controller)
    return { status: 'ok', durationMs: elapsedMs(startedAt) }
  } catch {
    return {
      status: 'error',
      durationMs: elapsedMs(startedAt),
      error: {
        category: 'database_unavailable',
        message: 'Database readiness check failed',
      },
    }
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  controller: AbortController,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort()
      reject(new Error('Readiness check timed out'))
    }, timeoutMs)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function buildLogFields(
  context: RequestContext,
  status: HealthStatus,
  errorCategory?: string,
): HealthLogFields {
  return {
    requestId: context.requestId,
    path: context.pathname,
    status,
    durationMs: elapsedMs(context.startedAt),
    ...(errorCategory ? { errorCategory } : {}),
  }
}

function jsonResponse(body: HealthPayload | ReadinessPayload, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function readRelease(): string | null {
  const release =
    import.meta.env.VITE_SENTRY_RELEASE ?? import.meta.env.VITE_APP_VERSION
  return release?.trim() || null
}

async function noopCheck(_signal?: AbortSignal): Promise<void> {}
