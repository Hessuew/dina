import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { DefaultCatchBoundary } from './components/navigation/DefaultCatchBoundary'
import { NotFound } from './components/navigation/NotFound'
import { initializeBrowserSentry } from '@/utils/observability/browser-sentry'
import { resolveObservabilityIdentity } from '@/utils/observability/domain/identity.domain'
import { resolveObservabilityDsn } from '@/utils/observability/domain/dsn.domain'

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

    initializeBrowserSentry({
      dsn: resolveObservabilityDsn(
        import.meta.env.VITE_BETTER_STACK_DSN,
        import.meta.env.VITE_SENTRY_DSN,
      ),
      environment: identity.environment,
      release: identity.release,
    })
  }

  return router
}
