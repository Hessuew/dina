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
  useRouteContext,
} from '@tanstack/react-router'
import type { AnyRoute } from '@tanstack/react-router'
import type { UserContext } from '@/utils/auth/domain/user-context.domain'

// Freshly constructed routes fail the structural AnyRoute check in the
// upgraded router packages (useMatch contravariance); cast at the
// AnyRoute-typed boundaries the same way the generated route tree does.
const asRoute = (route: unknown) => route as AnyRoute

const user: UserContext = {
  avatarUrl: undefined,
  bio: undefined,
  email: 'root@example.com',
  fullName: 'Root User',
  id: 'u1',
  role: 'admin',
}

function RootShell() {
  const { user: contextUser } = useRouteContext({ strict: false })
  const role = contextUser?.role || 'student'
  return (
    <div>
      <span data-testid="root-user-id">{contextUser?.id}</span>
      <span data-testid="root-user-role">{role}</span>
      <Outlet />
    </div>
  )
}

function buildRouter() {
  const rootRoute = createRootRoute({
    beforeLoad: () => ({ user }),
    component: RootShell,
  })
  const indexRoute = createRoute({
    getParentRoute: () => asRoute(rootRoute),
    path: '/',
    component: () => null,
  })
  return createRouter({
    routeTree: asRoute(rootRoute.addChildren([asRoute(indexRoute)])),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
}

afterEach(cleanup)

describe('root route context via useRouteContext({ strict: false })', () => {
  it('exposes the root beforeLoad context inside the root component', async () => {
    render(<RouterProvider router={buildRouter()} />)

    expect((await screen.findByTestId('root-user-id')).textContent).toBe('u1')
    expect((await screen.findByTestId('root-user-role')).textContent).toBe(
      'admin',
    )
  })
})
