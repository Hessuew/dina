# Error Tracing With Sentry

**Status:** Baseline implemented, hardening planned

## Current Baseline

- Worker-side Sentry is initialized in `src/server.ts`.
- Client-side Sentry is initialized in `src/router.tsx`.
- Expected 4xx, router-control-flow, benign browser network TypeErrors (`Failed to fetch` / `Load failed` / Firefox NetworkError), dynamic-import load noise, and stale server-fn ID misses are suppressed by `shouldSuppressFromSentry()`.
- User identity attachment is documented in ADR 0013.

## Hardening Work

- Confirm production, preview, and local environments produce distinguishable Sentry environments.
- Confirm releases/source maps are attached for deployed builds.
- Add a documented server error drill and frontend error drill.
- Confirm alert rules target actionable failures, not expected validation or auth errors.
- Review sampling once production traffic is real.

## Ownership

Sentry is for application exceptions, traces, releases, affected users, and regression diagnosis. Cloudflare remains the first surface for Worker request volume, status codes, latency, and structured logs.
