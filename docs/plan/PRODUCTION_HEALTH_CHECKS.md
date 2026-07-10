# Production Health Checks

**Status:** Implemented baseline  
**Owner:** Engineering  
**Related code:** `src/server.ts`, `src/utils/health/`

## Endpoints

`GET /healthz`

- Purpose: confirms the Worker and application bundle can serve traffic.
- Dependency checks: none.
- Success: `200` with JSON body.
- Failure mode: unexpected Worker/runtime failure.

`GET /readyz`

- Purpose: confirms the app can reach the database through the same `getDb()` and Hyperdrive path used by server code.
- Dependency checks: database `select 1`.
- Timeout: dependency check fails closed after 2s (configurable in `handleReadinessRequest` via `checkTimeoutMs`).
- Success: `200` when the dependency check succeeds.
- Failure: `503` when the database check fails or times out.

## Response Contract

Both endpoints return redacted JSON:

- `status`: `ok` or `error`.
- `service`: `christ-dina`.
- `environment`: runtime mode when available.
- `release`: release/app version when available, otherwise `null`.
- `requestId`: `cf-ray`, `x-request-id`, or generated UUID.
- `timestamp`: ISO timestamp.
- `durationMs`: rounded elapsed time.

`/readyz` also includes `dependencies.database.status`, `durationMs`, and a generic error category when the check fails. It must never return connection strings, credentials, raw exception messages, or Supabase service-role data.

## Logging

Each endpoint writes one structured JSON log event:

- `health_check` for `/healthz`.
- `readiness_check` for `/readyz`.
- `level`, `requestId`, `path`, `status`, `durationMs`, and `errorCategory` when applicable.

Cloudflare logs and traces are the first operational surface for these events. Sentry should capture unexpected application exceptions through the existing Worker wrapper; readiness polling failures are returned as `503` and logged to avoid noisy issue creation.

## Verification

- Call `/healthz` in local preview and production after deploy.
- Call `/readyz` with a valid database binding and verify `200`.
- Temporarily point the database binding/env to an invalid value in a non-production environment and verify `/readyz` returns `503` with no secret leakage.
- Confirm Cloudflare logs contain structured events for both endpoints.
