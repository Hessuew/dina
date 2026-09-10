import * as Sentry from '@sentry/cloudflare'
import { wrapFetchWithSentry } from '@sentry/tanstackstart-react'
import handler from '@tanstack/react-start/server-entry'
import { shouldSuppressFromSentry } from '@/utils/errors'
import {
  checkDatabaseReadiness,
  handleHealthRequest,
  handleReadinessRequest,
  isOperationalPath,
} from '@/utils/health'
import { resolveObservabilityIdentity } from '@/utils/observability/domain/identity.domain'

type HandlerOptions = Parameters<typeof handler.fetch>[1]
type WorkerObservabilityEnv = Env & {
  SENTRY_ENVIRONMENT?: string
  SENTRY_RELEASE?: string
}

const appHandler = {
  async fetch(request: Request, opts?: unknown): Promise<Response> {
    const operationalResponse = await handleOperationalRequest(request)

    if (operationalResponse) return operationalResponse

    return handler.fetch(request, opts as HandlerOptions)
  },
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
      const workerEnv = env as WorkerObservabilityEnv
      const identity = resolveObservabilityIdentity(
        import.meta.env.MODE,
        workerEnv.SENTRY_ENVIRONMENT,
        workerEnv.SENTRY_RELEASE ??
          import.meta.env.VITE_SENTRY_RELEASE ??
          import.meta.env.VITE_APP_VERSION,
      )

      return {
        dsn: env.SENTRY_DSN,
        environment: identity.environment,
        release: identity.release,
        beforeSend: (event, hint) =>
          shouldSuppressFromSentry(hint.originalException) ? null : event,
      }
    }, wrapFetchWithSentry(appHandler))
  : appHandler
