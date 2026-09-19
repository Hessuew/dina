/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'

import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { createServerFn } from '@tanstack/react-start'
import * as React from 'react'

import type { UserContext } from '@/utils/auth/domain/user-context.domain'
import type { UserContextCacheEntry } from '@/utils/auth/domain/user-context-cache.domain'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar/Sidebar'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import appCss from '@/styles/app.css?url'
import { seo } from '@/utils/seo'

import { getRootUserContext } from '@/utils/auth/auth'
import { readUserContextCache } from '@/utils/auth/domain/user-context-cache.domain'
import { DefaultCatchBoundary } from '@/components/navigation/DefaultCatchBoundary'
import { NotFound } from '@/components/navigation/NotFound'
import { Header } from '@/components/navigation/Header'
import { useSessionPrivateImageCacheUser } from '@/hooks/useSessionPrivateImageUrl'
import { setBrowserSentryUser } from '@/utils/observability/browser-sentry'
import {
  identifyAnalyticsUser,
  initializeAnalytics,
  resetAnalyticsUser,
} from '@/utils/analytics'

const fetchUser = createServerFn({ method: 'GET' }).handler(getRootUserContext)

// Client-only cache: the server module scope is shared across requests.
const USER_CONTEXT_TTL_MS = 60_000
let cachedUserContext: UserContextCacheEntry<UserContext | null> | undefined
let pendingUserContext: Promise<UserContext | null> | undefined
let cacheEpoch = 0

export function clearRootUserContextCache() {
  cachedUserContext = undefined
  cacheEpoch += 1
}

async function resolveUserContext(): Promise<UserContext | null> {
  if (import.meta.env.SSR) return fetchUser()

  const cached = readUserContextCache(
    cachedUserContext,
    Date.now(),
    USER_CONTEXT_TTL_MS,
  )
  if (cached.hit) return cached.user
  if (pendingUserContext) return pendingUserContext

  const epoch = cacheEpoch
  const fetchedAt = Date.now()
  pendingUserContext = fetchUser()
    .then((user) => {
      if (epoch === cacheEpoch) {
        cachedUserContext = { user, fetchedAt }
      }
      return user
    })
    .finally(() => {
      pendingUserContext = undefined
    })
  return pendingUserContext
}

const LazyAppSidebar = React.lazy(() =>
  import('@/components/navigation/AppSidebar').then(({ AppSidebar }) => ({
    default: AppSidebar,
  })),
)

export const Route = createRootRoute({
  beforeLoad: async () => ({ user: await resolveUserContext() }),
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      ...seo({
        title: 'Disciplers of Nations Academy | Learn Christ, Not Theology',
        description:
          'DINA is a free, 9-month online Discipleship Training School. 18 lessons, biweekly personal mentorship, and a formation journey that takes believers from infancy to maturity — no prerequisites, open to all.',
        keywords:
          'Disciplers of Nations Academy, DINA, discipleship training school, online discipleship, Christian formation, biblical foundations, free Christian school, mentorship, disciple nations, spiritual maturity, christ-dina',
        image: `${import.meta.env.VITE_APP_URL ?? 'https://christ-dina.org'}/og-logo.webp`,
      }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    )
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

// Browser-only: syncs the route-context user onto the client Sentry scope so
// browser errors are traceable. `useEffect` never runs during SSR.
function useSentryUser(user: UserContext | null | undefined) {
  useSessionPrivateImageCacheUser(user?.id)

  React.useEffect(() => {
    setBrowserSentryUser(user)
  }, [user])
}

// Browser-only: initializes optional PostHog capture and keeps identity scoped
// to the authenticated user without sending email or profile text.
function useAnalyticsUser(user: UserContext | null | undefined) {
  React.useEffect(() => {
    initializeAnalytics()

    if (user) {
      identifyAnalyticsUser(user)
    } else {
      resetAnalyticsUser()
    }
  }, [user])
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { user } = Route.useRouteContext()
  const role = user?.role || 'student'

  useSentryUser(user)
  useAnalyticsUser(user)

  return (
    <html>
      <head>
        <HeadContent />
      </head>

      <body>
        <SidebarProvider
          defaultOpen={Boolean(user)}
          enableKeyboardShortcut={Boolean(user)}
        >
          <TooltipProvider>
            {user && (
              <React.Suspense fallback={null}>
                <LazyAppSidebar user={user} role={role} />
              </React.Suspense>
            )}
            <SidebarInset>
              <Header user={user} />
              {children}
              <Toaster />
              <TanStackRouterDevtools position="bottom-right" />
              <Scripts />
            </SidebarInset>
          </TooltipProvider>
        </SidebarProvider>
      </body>
    </html>
  )
}
