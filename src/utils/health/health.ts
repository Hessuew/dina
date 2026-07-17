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

type HealthOptions = {
  checkDatabase?: () => Promise<void>
  environment?: string
  now?: () => Date
  release?: string | null
  requestId?: string
}

type LogEntry = {
  level: 'info' | 'warn'
  event: 'health_check' | 'readiness_check'
  requestId: string
  path: string
  status: HealthStatus
  durationMs: number
  errorCategory?: string
}

const SERVICE_NAME = 'christ-dina'

export function isOperationalPath(pathname: string): boolean {
  return pathname === '/healthz' || pathname === '/readyz'
}

export function handleHealthRequest(
  request: Request,
  options: HealthOptions = {},
): Response {
  const context = buildRequestContext(request, options)
  const body = buildHealthPayload(context, 'ok')

  writeStructuredLog(buildLogEntry(context, 'health_check', body.status))

  return jsonResponse(body, 200)
}

export async function handleReadinessRequest(
  request: Request,
  options: HealthOptions = {},
): Promise<Response> {
  const context = buildRequestContext(request, options)
  const database = await checkDependency(options.checkDatabase ?? noopCheck)
  const status = database.status
  const body = {
    ...buildHealthPayload(context, status),
    dependencies: { database },
  }

  writeStructuredLog(
    buildLogEntry(context, 'readiness_check', status, database.error?.category),
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
    environment: options.environment ?? import.meta.env.MODE,
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
  check: () => Promise<void>,
): Promise<DependencyResult> {
  const startedAt = performance.now()

  try {
    await check()
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

function buildLogEntry(
  context: RequestContext,
  event: LogEntry['event'],
  status: HealthStatus,
  errorCategory?: string,
): LogEntry {
  return {
    level: status === 'ok' ? 'info' : 'warn',
    event,
    requestId: context.requestId,
    path: context.pathname,
    status,
    durationMs: elapsedMs(context.startedAt),
    ...(errorCategory ? { errorCategory } : {}),
  }
}

function writeStructuredLog(entry: LogEntry): void {
  const line = JSON.stringify(entry)

  if (entry.level === 'warn') {
    console.warn(line)
    return
  }

  console.info(line)
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

function readRequestId(request: Request): string {
  return (
    request.headers.get('cf-ray') ??
    request.headers.get('x-request-id') ??
    crypto.randomUUID()
  )
}

function readRelease(): string | null {
  return (
    import.meta.env.VITE_SENTRY_RELEASE ??
    import.meta.env.VITE_APP_VERSION ??
    null
  )
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt))
}

async function noopCheck(): Promise<void> {}
