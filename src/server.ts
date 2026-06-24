import * as Sentry from '@sentry/cloudflare'
import { wrapFetchWithSentry } from '@sentry/tanstackstart-react'
import handler from '@tanstack/react-start/server-entry'

// In the Vite dev server there is no Cloudflare Workers `env`, so the
// `@sentry/cloudflare` wrapper (which reads the DSN off `env`) can't run.
// Wrap only in the built Worker; dev falls back to the plain handler.
export default import.meta.env.PROD
  ? Sentry.withSentry(
      (env) => ({ dsn: env.SENTRY_DSN }),
      // @ts-expect-error - handler is not typed as a Cloudflare handler
      wrapFetchWithSentry(handler),
    )
  : handler
