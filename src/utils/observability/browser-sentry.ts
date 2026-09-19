import type * as Sentry from '@sentry/tanstackstart-react'

import type { UserContext } from '@/utils/auth/domain/user-context.domain'
import { shouldSuppressFromSentry } from '@/utils/errors'
import { addActiveTraceContext } from '@/utils/observability/trace-context'

type BrowserSentry = typeof Sentry

let browserSentryLoad: Promise<BrowserSentry | null> | null = null
let browserSentrySchedule: number | null = null
let browserSentryOptions: Parameters<BrowserSentry['init']>[0] | null = null
let browserSentryUser: UserContext | null | undefined
let browserSentryInitialized = false

function loadBrowserSentry(): Promise<BrowserSentry | null> {
  browserSentryLoad ??= import('@sentry/tanstackstart-react').catch(() => null)
  return browserSentryLoad
}

function setLoadedBrowserSentryUser(sentry: BrowserSentry): void {
  if (browserSentryUser === undefined) return
  sentry.setUser(
    browserSentryUser
      ? {
          id: browserSentryUser.id,
          email: browserSentryUser.email,
          role: browserSentryUser.role,
        }
      : null,
  )
}

function initializeLoadedBrowserSentry(): void {
  void loadBrowserSentry().then((sentry) => {
    if (!sentry) return

    if (!browserSentryInitialized && browserSentryOptions) {
      sentry.init(browserSentryOptions)
      browserSentryInitialized = true
    }
    setLoadedBrowserSentryUser(sentry)
  })
}

function scheduleBrowserSentryLoad(): void {
  if (browserSentryLoad || browserSentrySchedule !== null) return

  const start = () => {
    browserSentrySchedule = null
    initializeLoadedBrowserSentry()
  }

  const requestIdleCallback = (
    window as unknown as {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number
    }
  ).requestIdleCallback
  const schedule = requestIdleCallback
    ? () => requestIdleCallback(start, { timeout: 2_000 })
    : () => window.setTimeout(start, 2_000)
  browserSentrySchedule = schedule()
}

export function initializeBrowserSentry(options: {
  dsn?: string
  environment: string
  release?: string
}): void {
  browserSentryOptions = {
    dsn: options.dsn,
    environment: options.environment,
    release: options.release,
    allowUrls: [/\/assets\//],
    beforeSend: (event, hint) => {
      if (shouldSuppressFromSentry(hint.originalException)) return null
      return addActiveTraceContext(event)
    },
  }

  if (browserSentryLoad) {
    initializeLoadedBrowserSentry()
  } else {
    scheduleBrowserSentryLoad()
  }
}

export function setBrowserSentryUser(
  user: UserContext | null | undefined,
): void {
  browserSentryUser = user
  if (browserSentryLoad) initializeLoadedBrowserSentry()
  else scheduleBrowserSentryLoad()
}

export function captureBrowserSentryException(error: unknown): void {
  initializeLoadedBrowserSentry()
  void loadBrowserSentry().then((sentry) => {
    sentry?.captureException(error)
  })
}
