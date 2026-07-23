/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'

import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { createServerFn } from '@tanstack/react-start'
import * as Sentry from '@sentry/tanstackstart-react'
import * as React from 'react'

import type { User } from '@supabase/supabase-js'
import type { UserContext } from '@/utils/auth/domain/user-context.domain'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar/Sidebar'
import { AppSidebar } from '@/components/navigation/AppSidebar'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import appCss from '@/styles/app.css?url'
import { seo } from '@/utils/seo'

import { getDb } from '@/db'
import { getSupabaseServerClient } from '@/utils/supabase'
import {
  buildUserContext,
  isAuthenticatedUser,
} from '@/utils/auth/domain/user-context.domain'
import { DefaultCatchBoundary } from '@/components/navigation/DefaultCatchBoundary'
import { NotFound } from '@/components/navigation/NotFound'
import { Header } from '@/components/navigation/Header'
import { signPrivateStoragePath } from '@/utils/storage/service/private-storage.service'

const fetchUser = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data, error: _error } = await supabase.auth.getUser()

  if (!isAuthenticatedUser(data.user)) {
    return null
  }

  // Fetch user profile to get avatarUrl and fullName
  const db = await getDb()

  const profile = await db.query.profiles.findFirst({
    where: (t, { eq }) => eq(t.id, (data.user as User).id),
    columns: {
      avatarUrl: true,
      bio: true,
      fullName: true,
      role: true,
    },
  })

  const signedProfile = profile
    ? {
        ...profile,
        avatarUrl: await signPrivateStoragePath('avatars', profile.avatarUrl),
      }
    : undefined
  return buildUserContext(data.user, signedProfile)
})

export const Route = createRootRoute({
  beforeLoad: async () => {
    const user = await fetchUser()

    return {
      user,
    }
  },
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
  React.useEffect(() => {
    if (user) {
      Sentry.setUser({ id: user.id, email: user.email, role: user.role })
    } else {
      Sentry.setUser(null)
    }
  }, [user])
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { user } = Route.useRouteContext()
  const role = user?.role || 'student'

  useSentryUser(user)

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
            {user && <AppSidebar user={user} role={role} />}
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
