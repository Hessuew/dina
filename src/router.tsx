import { createRouter } from '@tanstack/react-router'
import * as Sentry from '@sentry/tanstackstart-react'
import { routeTree } from './routeTree.gen'
import { DefaultCatchBoundary } from './components/navigation/DefaultCatchBoundary'
import { NotFound } from './components/navigation/NotFound'

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <NotFound />,
    scrollRestoration: true,
  })

  if (!router.isServer) {
    Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN })
  }

  return router
}
