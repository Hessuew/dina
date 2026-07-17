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

type HandlerOptions = Parameters<typeof handler.fetch>[1]

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
  ? Sentry.withSentry(
      (env) => ({
        dsn: env.SENTRY_DSN,
        beforeSend: (event, hint) =>
          shouldSuppressFromSentry(hint.originalException) ? null : event,
      }),
      wrapFetchWithSentry(appHandler),
    )
  : appHandler
