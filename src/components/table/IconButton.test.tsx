// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { EyeIcon } from 'lucide-react'
import { IconButton } from './IconButton'
import type { AnyRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'

// Freshly constructed routes fail the structural AnyRoute check in the
// upgraded router packages (useMatch contravariance); cast at the
// AnyRoute-typed boundaries the same way the generated route tree does.
const asRoute = (route: unknown) => route as AnyRoute

function renderAtIndex(ui: ReactNode) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> })
  const indexRoute = createRoute({
    getParentRoute: () => asRoute(rootRoute),
    path: '/',
    component: () => <TooltipProvider>{ui}</TooltipProvider>,
  })
  const loginRoute = createRoute({
    getParentRoute: () => asRoute(rootRoute),
    path: '/login',
    component: () => null,
  })
  const studentRoute = createRoute({
    getParentRoute: () => asRoute(rootRoute),
    path: '/students/$studentId',
    component: () => null,
  })
  const router = createRouter({
    routeTree: asRoute(
      rootRoute.addChildren([
        asRoute(indexRoute),
        asRoute(loginRoute),
        asRoute(studentRoute),
      ]),
    ),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return render(<RouterProvider router={router} />)
}

afterEach(cleanup)

describe('IconButton link navigation', () => {
  it('renders a root link for to="/"', async () => {
    renderAtIndex(<IconButton icon={EyeIcon} label="Home" to={{ to: '/' }} />)

    const link = await screen.findByRole('link')
    expect(link.getAttribute('href')).toBe('/')
  })

  it('renders an absolute link for a plain path', async () => {
    renderAtIndex(
      <IconButton icon={EyeIcon} label="Login" to={{ to: '/login' }} />,
    )

    const link = await screen.findByRole('link')
    expect(link.getAttribute('href')).toBe('/login')
  })

  it('interpolates params into the link href', async () => {
    renderAtIndex(
      <IconButton
        icon={EyeIcon}
        label="Student"
        to={{ to: '/students/$studentId', params: { studentId: '42' } }}
      />,
    )

    const link = await screen.findByRole('link')
    expect(link.getAttribute('href')).toBe('/students/42')
  })

  it('renders a button without a link when to is omitted', async () => {
    renderAtIndex(<IconButton icon={EyeIcon} label="Edit" onClick={() => {}} />)

    await screen.findByRole('button')
    expect(screen.queryByRole('link')).toBeNull()
  })
})
