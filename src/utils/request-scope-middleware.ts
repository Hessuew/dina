import { createMiddleware } from '@tanstack/react-start'
import { withRequestScope } from './request-scope'

export const requestScopeMiddleware = createMiddleware().server(
  async ({ next }) => withRequestScope(async () => await next()),
)

export const requestScopeFunctionMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) => withRequestScope(async () => await next()))
