# Structured Logging

**Status:** Planned after health baseline

## Target Shape

Server-side operational logs should be JSON objects with:

- `level`: `info`, `warn`, or `error`.
- `event`: stable event name.
- `requestId`: `cf-ray`, `x-request-id`, or generated UUID.
- `route` or `path`: route/action name when available.
- `userId`: only when authenticated and safe.
- `status`: outcome category.
- `durationMs`: elapsed time for the operation.
- `errorCategory`: stable category for failures.

## Redaction Rules

Never log passwords, tokens, cookies, Supabase service-role keys, connection strings, raw request bodies, or raw exception messages that may contain secrets. Prefer stable categories and IDs that let the team pivot into Sentry or Cloudflare logs.

## Rollout

1. Keep the health/readiness logs as the first canonical example.
2. Add a shared server logging helper before replacing broad `console.error` and `console.warn` usage.
3. Convert high-value server functions first: auth, enrollment, assignment submission, teacher review, admin workflows.
4. Keep expected user-input failures out of noisy error logs.
