# GNHF-10.9.206 — Engineering roadmap implementation handoff

**Date:** 2026-09-10  
**Iteration:** 3
**Scope:** make the Sentry-compatible integration ready for a provider cutover
with explicit environment/release identity and externalized source-map settings.

## Executive summary

The repository already has the first production-fundamentals slice:

- `GET /healthz` verifies that the Worker/application can serve requests.
- `GET /readyz` verifies database readiness through the production DB path and
  fails closed after two seconds.
- Both endpoints emit redacted JSON logs and no-store JSON responses.
- Cloudflare Worker observability is enabled in `wrangler.jsonc` with 100%
  log sampling and 1% trace sampling.
- Application error capture currently uses the Sentry SDK packages in the
  browser and Worker.

The operating decision for this roadmap is:

> Better Stack is the operator-facing replacement for Sentry: Better Stack
> Errors receives the existing Sentry-compatible error events, Better Stack
> Logs & Traces receives Cloudflare telemetry, and Better Stack Uptime monitors
> the public health endpoints.

The Sentry SDK imports can remain during the transition because Better Stack
officially supports the Sentry SDK protocol. The cutover is primarily a DSN,
source-map, Cloudflare destination, and dashboard change. Do not add the
Better Stack browser JavaScript tag while the existing Sentry-compatible client
SDK is active; doing both would duplicate browser errors and page telemetry.

No secrets, account tokens, or account-specific URLs belong in this file or in
the repository.

## What the previous iteration changed

- Captured the Better Stack replacement decision and the staged cutover plan.
- Documented exact dashboard navigation, source creation, Cloudflare
  destination values, health monitors, dashboards, alerts, verification, and
  rollback steps.
- Recorded which roadmap work is already implemented, which work is pending,
  and which work requires an authenticated Better Stack, Cloudflare, Supabase,
  Slack, or Notion dashboard action.

The previous iteration intentionally did not change application code: the
Better Stack application DSN, Telemetry source token/host, and Cloudflare
destination names did not exist in the repository and had to be created in the
external accounts first.

## Iteration 3 — explicit Better Stack-ready release identity

This iteration completed the smallest code slice that can be verified without
account-specific Better Stack credentials:

- Browser and Worker Sentry-compatible initialization now sends explicit
  `environment` and optional `release` values.
- Build modes map to the operational environments `local`, `preview`, and
  `production`; an explicit configured value wins when supplied.
- Source-map upload configuration now reads `SENTRY_ORG`, `SENTRY_PROJECT`,
  `SENTRY_URL`, and `SENTRY_RELEASE` from build environment. The previous
  hardcoded organization/project values are gone.
- Health-check release/environment identity uses the same mapping, so its
  response and logs can be correlated with Better Stack events.
- Added focused domain tests for environment/release normalization and build
  configuration resolution.

Changed paths: `vite.config.ts`, `scripts/vite-config.domain.ts`,
`src/router.tsx`, `src/server.ts`, `src/utils/health/health.ts`,
`src/utils/observability/domain/identity.domain.ts`, and the associated tests
and setup documentation.

Verification completed: focused tests (24 passing), full unit suite (1,919
passing), TypeScript typecheck, and `bun run quality:gate` all pass. The gate
also regenerated Cloudflare runtime types without changing the Worker binding
shape.

External follow-up remains required: create the Better Stack Errors source,
set its DSN and source-map endpoint in the deployment environments, provide a
release value such as the deployed commit SHA, and run the controlled ingestion
checks in the acceptance checklist below. No provider token or account URL was
added to the repository.

## Better Stack setup

Use the official product surfaces:

- [Better Stack Errors](https://errors.betterstack.com/) for application
  errors, releases, source maps, and error alerts.
- [Better Stack Telemetry](https://telemetry.betterstack.com/) for logs,
  traces, dashboards, and log-derived metrics.
- [Better Stack Uptime](https://uptime.betterstack.com/) for synthetic health
  checks and incident escalation.

### 1. Create the Errors application

In Better Stack Errors:

1. Open `Errors → Applications → Create application`.
2. Create an application named `christ-dina`.
3. Choose the TanStack Start/React platform when it is offered. The API
   platform identifier is `tanstack_start_react_errors`.
4. Select the required data region. Prefer the team’s approved EU region if
   data residency requires it.
5. Open `Errors → Applications → christ-dina → Ingest` and copy the DSN.

The DSN is the value that makes the current Sentry-compatible SDK send to
Better Stack. During the first cutover, replace the values of the existing
bindings rather than changing every import at once:

| Existing binding  | Value after cutover                         |
| ----------------- | ------------------------------------------- |
| `VITE_SENTRY_DSN` | Better Stack Errors browser/application DSN |
| `SENTRY_DSN`      | Better Stack Errors Worker/application DSN  |

The code still says `Sentry` during this compatibility phase because the
Better Stack Errors ingestion endpoint accepts the Sentry SDK format. A later
cleanup may rename the bindings and wrapper helpers after the cutover has been
observed in production.

Use distinct environments in the SDK configuration: `local`, `preview`, and
`production`. Use the deployed commit SHA as the release identifier when the
build pipeline exposes it. The next code change should add those explicit
`environment` and `release` options to the existing browser and Worker
initializers.

### 2. Configure source maps and releases

Open `Errors → Applications → christ-dina → Advanced settings` and copy the
Better Stack values for:

- Better Stack team ID used as `SENTRY_ORG`.
- Better Stack application ID used as `SENTRY_PROJECT`.
- Better Stack source-map endpoint used as `SENTRY_URL`.
- A Better Stack Telemetry API token used as `SENTRY_AUTH_TOKEN` for build
  upload only.

The repository already uses the Sentry Vite plugin in `vite.config.ts`.
Better Stack documents that the existing Sentry source-map upload integration
can be reused by pointing it at Better Stack. The next code slice should:

1. Read `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_URL` from build
   environment instead of keeping the organization/project hardcoded.
2. Keep `SENTRY_AUTH_TOKEN` available only to the build/source-map step.
3. Never expose that token through `VITE_*` variables or Worker runtime
   bindings.
4. Upload source maps for a preview release first, trigger one controlled test
   error, and confirm the stack is symbolicated in Better Stack.

### 3. Export Cloudflare Worker logs and traces

Better Stack’s recommended Cloudflare Workers integration uses Cloudflare’s
built-in OpenTelemetry destinations. It does not require a custom `fetch()` to
send telemetry from the application request path.

In Better Stack Telemetry:

1. Open `Sources → Connect source`.
2. Create an OpenTelemetry source named `christ-dina-cloudflare`.
3. Copy its **Ingesting host** and **Source token**. Keep both out of Git.

In the Cloudflare dashboard:

1. Open `Workers & Pages → Observability → Telemetry`.
2. Click `Add destination` and create a **Logs** destination named
   `betterstack-logs`.
3. Use this endpoint, substituting the host from the Better Stack source:
   `https://<INGESTING_HOST>/v1/logs`.
4. Add the custom header `Authorization: Bearer <SOURCE_TOKEN>`.
5. Add a second **Traces** destination named `betterstack-traces`.
6. Use `https://<INGESTING_HOST>/v1/traces` and the same Authorization header.
7. Save both destinations before changing Wrangler configuration.

After the destinations exist, update the `observability` block in
`wrangler.jsonc` like this, preserving the current top-level settings:

```jsonc
"observability": {
  "enabled": true,
  "logs": {
    "head_sampling_rate": 1,
    "destinations": ["betterstack-logs"],
    "persist": true
  },
  "traces": {
    "enabled": true,
    "head_sampling_rate": 1,
    "destinations": ["betterstack-traces"],
    "persist": true
  }
}
```

Keep `persist: true` for the initial dual-observation period so Cloudflare
retains its copy while Better Stack is validated. Lower the production trace
sampling rate from `1` after the first verification window if volume or cost
requires it. Only set `persist: false` after the team explicitly accepts
Better Stack as the sole log/trace retention surface.

Deploy with the repository’s normal release workflow, then make one request to
the Worker and check `Telemetry → Live tail` in Better Stack. Confirm that the
health endpoint’s structured fields are searchable: `event`, `requestId`,
`path`, `status`, `durationMs`, and `errorCategory`.

### 4. Create Uptime monitors

In Better Stack Uptime, create two HTTP monitors:

| Monitor                 | URL                               | Initial policy                              |
| ----------------------- | --------------------------------- | ------------------------------------------- |
| DINA Worker health      | `https://christ-dina.org/healthz` | Expect HTTP 2xx; check every 60 seconds     |
| DINA database readiness | `https://christ-dina.org/readyz`  | Expect HTTP 2xx; check every 60–120 seconds |

Assign both monitors to the team’s escalation target and configure email plus
Slack if the workspace is available. `/healthz` detects application/Worker
availability. `/readyz` detects database-path failures and can alert even when
the Worker itself is still serving requests.

Test each monitor in a non-production or controlled window. Do not deliberately
break production database credentials to test readiness.

## Better Stack dashboard and alert recipe

Create a dashboard in `Telemetry → Metrics → Create dashboard`. Start with a
blank dashboard named `DINA — Production Overview`, choose the Cloudflare or
application source, and add these sections:

1. **Availability:** `/healthz` and `/readyz` uptime from Uptime monitors.
2. **Traffic:** request volume and status-code distribution from Cloudflare
   telemetry.
3. **Latency:** p50/p95/p99 request duration from Cloudflare telemetry.
4. **Application errors:** error groups and error volume from Better Stack
   Errors.
5. **Readiness logs:** `health_check` and `readiness_check` events from the
   Cloudflare log source.
6. **Delivery context:** release/commit, deployment status, and recent deploy
   links from GitHub/Cloudflare.

Use the source selector and dashboard time variables (`{{time}}`,
`{{start_time}}`, `{{end_time}}`) instead of hardcoding a date window. Better
Stack dashboards can use drag-and-drop metrics, log filtering, PromQL for
metrics, or ClickHouse SQL for more control. Raw log fields may be nested
differently by the OpenTelemetry source, so inspect one event in Live tail
before saving a JSON/SQL field path.

Useful initial searches for this application are:

- `health_check`
- `readiness_check`
- `database_unavailable`
- `level=error` or the source’s equivalent error-level field

Recommended initial alert policy, matching the roadmap’s critical failure
modes:

| Alert                   | Initial condition                           | First action                                                                |
| ----------------------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| Site unavailable        | `/healthz` monitor fails                    | Check Better Stack incident, Cloudflare Worker deployment, and route status |
| Database unavailable    | `/readyz` monitor fails                     | Check Supabase status/DB metrics and Hyperdrive binding before rollback     |
| Sustained server errors | 5xx/error rate above 5% for 5 minutes       | Open the error group and compare with the latest release                    |
| Latency regression      | p95 above 1 second for 5 minutes            | Inspect the slow route, DB queries, and recent deployment                   |
| New high-severity error | First occurrence or high-impact error group | Acknowledge, link the error group in the incident record, and assign owner  |

Create alerts from the chart’s alert control. Better Stack supports threshold,
relative-change, and anomaly alerts; use a fixed threshold first, then tune
after enough production history exists. Configure the escalation target and
confirm that the alert creates a Better Stack Uptime incident and delivers the
selected email/Slack notification.

## Links to put in Notion

Notion is the operations index, not a second dashboard implementation. After
the external objects exist, update the existing rows rather than creating
duplicates:

| Notion object                        | What to paste in `Link`                           | Initial status                              |
| ------------------------------------ | ------------------------------------------------- | ------------------------------------------- |
| Better Stack errors/tracing overview | Better Stack Errors application URL               | `Planned`, then `Active` after verification |
| Cloudflare production health         | Cloudflare Worker `christ-dina` Observability URL | `Planned`, then `Active`                    |
| Supabase database health             | Project dashboard’s Database/Reports URL          | `Planned`, then `Active`                    |
| GitHub delivery health               | Repository Actions/workflow URL                   | `Planned`, then `Active`                    |
| PostHog product analytics            | Project dashboard URL, once implemented           | `Planned`                                   |

The current Operational Dashboards schema has no dedicated `Better Stack`
option. Until the Notion schema is deliberately extended, use `Tool=Other` and
write `Better Stack Errors + Telemetry + Uptime` in the row name/notes. Do not
invent a select value in a `--set` command.

Use the stable IDs from `docs/notion/README.md` and run:

```sh
bun run docs:notion-check
```

before each final sync. For this handoff, the material Notion targets are the
Observability hub, Operational Dashboards, SLI/SLO Catalog, and Engineering
Roadmap. Update the dashboard row’s URL only after a real URL exists.

## Roadmap status and next slices

### Phase 1 — Production fundamentals

| Roadmap item          | Current state                                                                                                          | Next smallest verifiable slice                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Health checks         | Implemented in `src/server.ts` and `src/utils/health/`                                                                 | Verify `/healthz` and `/readyz` after deployment                                        |
| Structured logging    | Health endpoints emit redacted JSON; broad server logs still use ad-hoc console calls                                  | Add a small shared server logger and migrate one high-value service at a time           |
| Error tracking        | Sentry-compatible SDK wiring now emits explicit environment/release identity; Better Stack provider cutover is pending | Create Better Stack DSN, configure deployment secrets, and verify ingestion/source maps |
| Basic metrics         | Cloudflare logs/traces are enabled; no app metrics dashboard is in repo                                                | Create Better Stack/Cloudflare dashboard and extract stable log metrics                 |
| Production dashboards | Notion dashboard rows exist but links are blank                                                                        | Create external dashboards and update existing rows                                     |
| Alerting              | No verified production alert set                                                                                       | Configure Uptime, error-rate, readiness, and latency alerts; test them                  |

### Phase 2 — Reliability

The Notion SLI/SLO catalog has draft entries for web availability, application
error rate, and database restore confidence. Keep them as `Needs data`/`Draft`
until Better Stack and Cloudflare telemetry are visible. Then attach real
dashboard and runbook links and set review dates. The remaining work is:

- error-budget policy;
- incident workflow and runbook;
- backup/restore validation evidence; and
- ownership for every critical alert.

### Phase 3 — Safe delivery

The repository has quality-gate scripts and Cloudflare preview URL support.
Validate and document the release path after observability cutover:

- CI quality gate on changed files, typecheck, and unit tests;
- preview smoke test for `/healthz`, `/readyz`, login, and one authenticated
  read path;
- migration safety and rollback procedure;
- release/source-map verification in Better Stack; and
- feature flags only where a real rollout needs them.

### Phase 4 — Performance and scale

Still requires production data. Prioritize query/index review, request latency
charts, connection pressure, pagination/rate-limit review, caching, load
tests, and a background-job decision.

### Phase 5 — Security

Still requires an RBAC/RLS review, admin access hardening, secret inventory,
audit logging, dependency scanning, and threat modeling. Better Stack must not
receive passwords, tokens, cookies, service-role keys, connection strings,
raw submission text, or private mentorship content.

### Phase 6 — Long-term architecture

ADR process, domain boundaries, API contracts, technical-debt tracking, and
architecture reviews are already represented in repository/Notion structure;
continue linking implementation work to Linear issues as each item becomes
active.

## Cutover verification and rollback

### Acceptance checklist

- [ ] Better Stack Errors receives a controlled browser error.
- [ ] Better Stack receives a controlled Worker error.
- [ ] `local`, `preview`, and `production` are distinguishable.
- [ ] A production release has symbolicated source maps.
- [ ] Cloudflare logs and traces appear in Better Stack Live tail.
- [ ] `health_check` and `readiness_check` are searchable.
- [ ] `/healthz` and `/readyz` Uptime monitors are green.
- [ ] Error-rate, latency, and readiness alerts route to the agreed escalation
      target.
- [ ] At least one test alert is acknowledged and resolved.
- [ ] Notion dashboard rows contain real links and review dates.
- [ ] The old Sentry project is left read-only for the transition window, then
      disabled only after Better Stack retention and alerting are confirmed.

### Rollback

If Better Stack ingestion or alerting is not reliable, keep Cloudflare
`persist: true`, restore the previous Sentry DSN values, and redeploy through
the normal release path. Do not delete the old Sentry project or remove the
SDK packages until the acceptance checklist has passed and the retention
window has been agreed.

## Official references

- [Better Stack: Sentry SDK-compatible error ingestion](https://betterstack.com/docs/errors/collecting-errors/sentry-sdk/)
- [Better Stack: source maps with existing Sentry build integrations](https://betterstack.com/docs/errors/collecting-errors/upload-source-maps/)
- [Better Stack: Cloudflare Workers OpenTelemetry destinations](https://betterstack.com/docs/logs/cloudflare-opentelemetry/)
- [Better Stack: dashboard setup and query types](https://betterstack.com/docs/logs/dashboards/getting-started/)
- [Better Stack: dashboard alerts](https://betterstack.com/docs/logs/dashboards/alerts/)
- [Better Stack: Uptime monitoring](https://betterstack.com/docs/uptime/monitoring-start/)
