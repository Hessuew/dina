# Production Health Checks

**Status:** Implemented baseline; production smoke verified
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

Production responses also expose `x-dina-worker-version` and
`x-dina-worker-version-tag` from the Cloudflare version metadata binding. These
headers are used for release verification and incident correlation only; they
do not contain secrets.

`/readyz` also includes `dependencies.database.status`, `durationMs`, and a generic error category when the check fails. It must never return connection strings, credentials, raw exception messages, or Supabase service-role data.

## Logging

Each endpoint writes one structured JSON log event:

- `health_check` for `/healthz`.
- `readiness_check` for `/readyz`.
- `level`, `requestId`, `path`, `status`, `durationMs`, and `errorCategory` when applicable.

Cloudflare logs and traces are the first operational surface for these events. Better Stack should capture unexpected application exceptions through the existing Sentry-compatible Worker wrapper; readiness polling failures are returned as `503` and logged to avoid noisy issue creation.

## Verification

- Call `/healthz` in local preview and production after deploy.
- Call `/readyz` with a valid database binding and verify `200`.
- During a release, call both endpoints with
  `Cloudflare-Workers-Version-Overrides: christ-dina="<version-id>"` and
  require the matching version id, tag, and health payload release.
- During gradual deployment, send repeated requests with the same
  `Cloudflare-Workers-Version-Key` and verify the version metadata stays stable;
  test a hashed asset after the HTML response to catch split-version loading.
- Temporarily point the database binding/env to an invalid value in a non-production environment and verify `/readyz` returns `503` with no secret leakage.
- Confirm Cloudflare logs contain structured events for both endpoints.

### Production verification — 2026-09-12

The repository smoke check was run against `https://christ-dina.org`:

```text
health smoke passed: /healthz
health smoke passed: /readyz
```

Both endpoints returned HTTP `200` with `status: "ok"`, `service:
"christ-dina"`, `environment: "production"`, and a request ID. `/readyz`
also returned `dependencies.database.status: "ok"`. Responses were served
through Cloudflare and included `cache-control: no-store`; no credentials or
raw database errors were present.

The live payload at this pre-tag verification reported `release: null`. The
repository now injects release metadata for tagged builds, but production
release correlation remains pending until a tagged deployment is verified.

### Production verification — 2026-09-23

The smoke check was rerun against `https://christ-dina.org` and both
endpoints passed:

```text
health smoke passed: /readyz
health smoke passed: /healthz
```

The live Better Stack Uptime monitor now targets `/healthz`, checks every
three minutes, and is up with zero incidents. Cloudflare's Worker
observability view showed 146 successful events and 0 errors in the last hour;
the Worker overview showed 0 errors in the last 24 hours. `/readyz` remains a
database-readiness smoke check rather than a second synthetic monitor because
the current Better Stack plan marks additional monitors as billable. The
pre-tag live payload still reported `release: null`; deployment release
correlation remains open until the tagged production workflow is verified.
