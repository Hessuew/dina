# Error Tracking With Better Stack

**Status:** Sentry-compatible baseline and release identity implemented; Better Stack cutover pending

## Current Baseline

- Worker-side error tracking is initialized through the Sentry-compatible SDK
  in `src/server.ts`.
- Client-side error tracking is initialized through the Sentry-compatible SDK
  in `src/router.tsx`.
- Browser and Worker events now carry an explicit `local`, `preview`, or
  `production` environment plus an optional release identifier.
- Source-map upload configuration reads `SENTRY_ORG`, `SENTRY_PROJECT`,
  `SENTRY_URL`, and `SENTRY_RELEASE` from build environment rather than
  hardcoding the current provider account.
- Expected 4xx, router-control-flow, benign browser network TypeErrors (`Failed to fetch` / `Load failed` / Firefox NetworkError), dynamic-import load noise, and stale server-fn ID misses are suppressed by `shouldSuppressFromSentry()`.
- When an OpenTelemetry span is active, `beforeSend` adds its `trace_id` and
  `span_id` to the event context so Better Stack Errors can link the exception
  to Cloudflare Logs & Traces.
- User identity attachment is documented in ADR 0013. Better Stack accepts the
  existing SDK event format, so the provider cutover can happen by changing
  the DSN and validating ingestion before renaming code symbols.

## Hardening Work

- Create the Better Stack Errors application and replace the existing browser
  and Worker DSNs with the Better Stack DSN.
- Confirm production, preview, and local environments produce distinguishable
  Better Stack environments.
- Confirm Better Stack releases/source maps are attached for deployed builds
  using the external build values now supported by `vite.config.ts`.
- Add a documented server error drill and frontend error drill.
- Confirm alert rules target actionable failures, not expected validation or
  auth errors.
- Review sampling once production traffic is real.

## Ownership

Better Stack is for application exceptions, traces, releases, affected users,
logs, and regression diagnosis. Cloudflare remains the first operational source
for Worker request volume, status codes, latency, and structured logs while the
Better Stack destinations are being validated.
