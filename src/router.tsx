import { createRouter } from '@tanstack/react-router'
import * as Sentry from '@sentry/tanstackstart-react'
import { routeTree } from './routeTree.gen'
import { DefaultCatchBoundary } from './components/navigation/DefaultCatchBoundary'
import { NotFound } from './components/navigation/NotFound'
import { shouldSuppressFromSentry } from '@/utils/errors'

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    scrollRestoration: true,
  })

  if (!router.isServer) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      // Only capture errors with at least one frame from our JS bundle.
      // Filters third-party inline script noise (e.g. Cloudflare bot-protection
      // scripts injected directly into the HTML page).
      allowUrls: [/\/assets\//],
      beforeSend: (event, hint) =>
        shouldSuppressFromSentry(hint.originalException) ? null : event,
    })
  }

  return router
}
