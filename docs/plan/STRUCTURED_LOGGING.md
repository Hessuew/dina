# Structured Logging

**Status:** In progress

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

Never log passwords, tokens, cookies, Supabase service-role keys, connection strings, raw request bodies, or raw exception messages that may contain secrets. Prefer stable categories and IDs that let the team pivot into Better Stack or Cloudflare logs.

## Rollout

1. Keep the health/readiness logs as the first canonical example. **Done:**
   both endpoints now use `src/utils/observability/logger.ts`.
2. Add a shared server logging helper before replacing broad `console.error` and `console.warn` usage. **Done:**
   the helper emits stable JSON and recursively redacts sensitive fields and
   raw error messages.
3. Convert high-value server functions first: auth, enrollment, assignment submission, teacher review, admin workflows. **In progress:** assignment submission persistence now emits redacted `assignment_submission_saved` and `assignment_submission_failed` events with request correlation, outcome status, duration, and stable error category fields. Signup and OTP flows now emit the same shape for OTP delivery, account provisioning, rollback, auto-login, and resend outcomes.
4. Keep expected user-input failures out of noisy error logs.

The next migration should target one high-value server-function family at a
time and provide stable `event`, `requestId`, `status`, and `durationMs`
fields. Do not pass raw exception messages or request bodies to the logger.
