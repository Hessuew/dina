import { createRouter } from '@tanstack/react-router'
import * as Sentry from '@sentry/tanstackstart-react'
import { routeTree } from './routeTree.gen'
import { DefaultCatchBoundary } from './components/navigation/DefaultCatchBoundary'
import { NotFound } from './components/navigation/NotFound'
import { shouldSuppressFromSentry } from '@/utils/errors'
import { resolveObservabilityIdentity } from '@/utils/observability/domain/identity.domain'
import { resolveObservabilityDsn } from '@/utils/observability/domain/dsn.domain'
import { addActiveTraceContext } from '@/utils/observability/trace-context'

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    scrollRestoration: true,
  })

  if (!router.isServer) {
    const identity = resolveObservabilityIdentity(
      import.meta.env.MODE,
      import.meta.env.VITE_SENTRY_ENVIRONMENT,
      import.meta.env.VITE_SENTRY_RELEASE ?? import.meta.env.VITE_APP_VERSION,
    )

    Sentry.init({
      dsn: resolveObservabilityDsn(
        import.meta.env.VITE_BETTER_STACK_DSN,
        import.meta.env.VITE_SENTRY_DSN,
      ),
      environment: identity.environment,
      release: identity.release,
      // Only capture errors with at least one frame from our JS bundle.
      // Filters third-party inline script noise (e.g. Cloudflare bot-protection
      // scripts injected directly into the HTML page).
      allowUrls: [/\/assets\//],
      beforeSend: (event, hint) => {
        if (shouldSuppressFromSentry(hint.originalException)) return null
        return addActiveTraceContext(event)
      },
    })
  }

  return router
}
