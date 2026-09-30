import * as Sentry from '@sentry/cloudflare'
import { wrapFetchWithSentry } from '@sentry/tanstackstart-react'
import handler from '@tanstack/react-start/server-entry'
import { env as workerEnv } from 'cloudflare:workers'
import { shouldSuppressFromSentry } from '@/utils/errors'
import {
  checkDatabaseReadiness,
  handleHealthRequest,
  handleReadinessRequest,
  isOperationalPath,
} from '@/utils/health'
import { resolveObservabilityIdentity } from '@/utils/observability/domain/identity.domain'
import { resolveObservabilityDsn } from '@/utils/observability/domain/dsn.domain'
import { addActiveTraceContext } from '@/utils/observability/trace-context'
import { fetchWithAssetFallback } from '@/utils/asset-routing'
import { handleReleaseEndpoint } from '@/utils/observability/release-endpoints'
import { runRequestWithReleaseMetrics } from '@/utils/observability/release-request'
import {
  addWorkerVersionHeaders,
  readWorkerVersionMetadata,
} from '@/utils/observability/version-headers'

type HandlerOptions = Parameters<typeof handler.fetch>[1]

const appHandler = {
  async fetch(request: Request, opts?: unknown): Promise<Response> {
    const startedAt = performance.now()
    const metadata =
      readWorkerVersionMetadata(opts) ?? readWorkerVersionMetadata(workerEnv)
    const runtime = workerEnv as unknown as Parameters<
      typeof handleReleaseEndpoint
    >[1]
    const releaseResponse = await handleReleaseEndpoint(
      request,
      runtime,
      metadata,
    )
    if (releaseResponse) return releaseResponse

    const response = await runRequestWithReleaseMetrics(
      request,
      runtime,
      metadata,
      startedAt,
      async () => {
        const operationalResponse = await handleOperationalRequest(request)
        if (operationalResponse) return operationalResponse
        return fetchWithAssetFallback(request, runtime, () =>
          handler.fetch(request, opts as HandlerOptions),
        )
      },
    )
    return addWorkerVersionHeaders(
      response,
      { WORKER_VERSION: metadata },
      request,
    )
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readOptionalString(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined
  const candidate = value[key]
  return typeof candidate === 'string' ? candidate : undefined
}

async function handleOperationalRequest(
  request: Request,
): Promise<Response | null> {
  const pathname = new URL(request.url).pathname

  if (!isOperationalPath(pathname)) return null
  if (pathname === '/healthz') return handleHealthRequest(request)

  return handleReadinessRequest(request, {
    checkDatabase: checkDatabaseReadiness,
  })
}

// In the Vite dev server there is no Cloudflare Workers `env`, so the
// `@sentry/cloudflare` wrapper (which reads the DSN off `env`) can't run.
// Wrap only in the built Worker; dev falls back to the plain handler.
export default import.meta.env.PROD
  ? Sentry.withSentry((env) => {
      const identity = resolveObservabilityIdentity(
        import.meta.env.MODE,
        readOptionalString(env, 'SENTRY_ENVIRONMENT'),
        readOptionalString(env, 'SENTRY_RELEASE') ??
          import.meta.env.VITE_SENTRY_RELEASE ??
          import.meta.env.VITE_APP_VERSION,
      )

      return {
        dsn: resolveObservabilityDsn(
          readOptionalString(env, 'BETTER_STACK_DSN'),
          readOptionalString(env, 'SENTRY_DSN'),
        ),
        environment: identity.environment,
        release: identity.release,
        beforeSend: (event, hint) => {
          if (shouldSuppressFromSentry(hint.originalException)) return null
          return addActiveTraceContext(event)
        },
      }
    }, wrapFetchWithSentry(appHandler))
  : appHandler
