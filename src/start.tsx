import { createStart } from '@tanstack/react-start'
import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware,
} from '@sentry/tanstackstart-react'
import {
  requestScopeFunctionMiddleware,
  requestScopeMiddleware,
} from '@/utils/request-scope-middleware'

export const startInstance = createStart(() => ({
  requestMiddleware: [sentryGlobalRequestMiddleware, requestScopeMiddleware],
  functionMiddleware: [
    sentryGlobalFunctionMiddleware,
    requestScopeFunctionMiddleware,
  ],
}))
