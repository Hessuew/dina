import type * as Sentry from '@sentry/tanstackstart-react'

import type { UserContext } from '@/utils/auth/domain/user-context.domain'
import { shouldSuppressFromSentry } from '@/utils/errors'
import { addActiveTraceContext } from '@/utils/observability/trace-context'

type BrowserSentry = typeof Sentry

let browserSentryLoad: Promise<BrowserSentry | null> | null = null

function loadBrowserSentry(): Promise<BrowserSentry | null> {
  browserSentryLoad ??= import('@sentry/tanstackstart-react').catch(() => null)
  return browserSentryLoad
}

export function initializeBrowserSentry(options: {
  dsn?: string
  environment: string
  release?: string
}): void {
  void loadBrowserSentry().then((sentry) => {
    sentry?.init({
      dsn: options.dsn,
      environment: options.environment,
      release: options.release,
      allowUrls: [/\/assets\//],
      beforeSend: (event, hint) => {
        if (shouldSuppressFromSentry(hint.originalException)) return null
        return addActiveTraceContext(event)
      },
    })
  })
}

export function setBrowserSentryUser(
  user: UserContext | null | undefined,
): void {
  void loadBrowserSentry().then((sentry) => {
    if (user) {
      sentry?.setUser({ id: user.id, email: user.email, role: user.role })
    } else {
      sentry?.setUser(null)
    }
  })
}

export function captureBrowserSentryException(error: unknown): void {
  void loadBrowserSentry().then((sentry) => {
    sentry?.captureException(error)
  })
}
