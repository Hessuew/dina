import { createMiddleware } from '@tanstack/react-start'
import { withObservabilityRequest } from './observability/request-context'
import { withRequestScope } from './request-scope'

export const requestScopeMiddleware = createMiddleware().server(
  async ({ next, request }) =>
    withObservabilityRequest(request, () =>
      withRequestScope(async () => await next()),
    ),
)

export const requestScopeFunctionMiddleware = createMiddleware({
  type: 'function',
}).server(async ({ next }) =>
  withObservabilityRequest(undefined, () =>
    withRequestScope(async () => await next()),
  ),
)
