import { createCsrfMiddleware, createStart } from '@tanstack/react-start'
import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware,
} from '@sentry/tanstackstart-react'
import {
  requestScopeFunctionMiddleware,
  requestScopeMiddleware,
} from '@/utils/request-scope-middleware'

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

export const startInstance = createStart(() => ({
  requestMiddleware: [
    csrfMiddleware,
    sentryGlobalRequestMiddleware,
    requestScopeMiddleware,
  ],
  functionMiddleware: [
    sentryGlobalFunctionMiddleware,
    requestScopeFunctionMiddleware,
  ],
}))
