# Runtime and CI Secret Inventory

**Status:** In progress — the repository contract is documented; account-level
owners, production values, and the first controlled rotation are still external
follow-up work
**Phase:** Engineering Roadmap Phase 5: Security

## Scope and rules

This inventory covers values used by the Worker, browser build, local scripts,
GitHub Actions, and the Better Stack transition. The variable name may be
documented; the value must never be committed, pasted into Notion, emitted in a
log, or exposed through a `VITE_` variable unless it is explicitly public
configuration.

- `.env` is ignored and must contain development-branch values only.
- `VITE_*` values are bundled for the browser. They may contain public project
  identifiers, DSNs, keys, or dashboard links, but never service credentials.
- Cloudflare Worker secrets and GitHub environment secrets are separate stores;
  rotating one does not rotate the other.
- `SENTRY_*` names are compatibility names for source maps, agent triage, and
  rollback. Better Stack is the operator destination; do not add new Sentry
  runtime dependencies or credentials.
- Notion stores status, ownership roles, evidence links, and review dates only.
  It must not store secret values, DSNs, tokens, connection strings, or copied
  audit reports containing credentials.

## Variable inventory

### Server and deployment secrets

| Variable                            | Classification                     | Used by                                                                                      | Storage / owner                                                                                 | Rotation and verification                                                                                                                                                                    |
| ----------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`         | Restricted secret                  | Worker Supabase admin client; development seed job                                           | Cloudflare Worker secret; GitHub `development` environment secret; platform owner               | Rotate in Supabase, update both stores, deploy, run an authenticated smoke check and the development seed path, then revoke the old key                                                      |
| `RESEND_API_KEY`                    | Restricted secret                  | Resend transactional email sender                                                            | Cloudflare Worker secret; platform/email owner                                                  | Create a replacement in Resend, update the Worker secret, verify one controlled invitation/reset delivery, then revoke the old key                                                           |
| `WHATSAPP_ACCESS_TOKEN`             | Restricted secret                  | Meta WhatsApp Cloud API sender                                                               | Cloudflare Worker secret; communications owner                                                  | Create a replacement system-user token in Meta Business Suite, send one approved test/template message, then revoke the old token                                                            |
| `DATABASE_URL`                      | Restricted secret                  | Local Drizzle scripts; GitHub migration jobs; optional non-Worker fallback                   | Ignored local `.env`; GitHub `development` and `production` environment secrets; database owner | Rotate the Supabase pooler password/connection string, update the matching environment only, run migration-chain validation, then revoke the old credential                                  |
| `BETTER_STACK_DSN`                  | Restricted server DSN              | Worker error transport                                                                       | Cloudflare Worker secret; observability owner                                                   | Create/rotate the Better Stack Errors application DSN, update the Worker secret, trigger a controlled server error, verify ingestion and release/environment fields, then retire the old DSN |
| `SENTRY_DSN`                        | Temporary rollback secret          | Worker fallback error transport                                                              | Cloudflare Worker secret only while rollback support is retained; observability owner           | Keep empty unless rollback is required; remove after Better Stack acceptance and rollback evidence are complete                                                                              |
| `DEVELOPMENT_SEED_PASSWORD`         | Restricted secret                  | GitHub development seed job; local development seed                                          | Ignored local `.env`; GitHub `development` environment secret; development data owner           | Change the synthetic account password in the development branch, update both stores, rerun the idempotent seed, and confirm production is not targeted                                       |
| `SENTRY_AUTH_TOKEN`                 | Build secret                       | Optional Better Stack-compatible source-map upload through the Sentry-compatible Vite plugin | Build/deployment secret store; observability owner                                              | Issue a least-privilege replacement, run one source-map upload, verify symbolication, then revoke the old token                                                                              |
| `SENTRY_AXI_AUTH_TOKEN`             | Local operator secret              | `scripts/sentry-axi.mjs` issue/release triage                                                | Local ignored `.env` or operator secret store; observability owner                              | Rotate in the provider account, run a read-only issue-list check, then revoke the old token; never pass it to the browser or Worker                                                          |
| `CLOUDFLARE_API_TOKEN`              | Restricted deployment secret       | Production release Worker version upload/deploy and rollback                                 | GitHub Actions secret; platform owner                                                           | Scope to the `christ-dina` Worker version/deployment operations, run a dry-run, then verify upload, smoke, and rollback evidence                                                             |
| `CLOUDFLARE_ACCOUNT_ID`             | Restricted deployment identifier   | Wrangler account selection                                                                   | GitHub Actions secret or protected variable; platform owner                                     | Verify it names the intended account without logging it; rotate only with the matching API token                                                                                             |
| `CLOUDFLARE_VERSION_METRICS_TOKEN`  | Restricted metrics secret          | Per-version rollout metrics adapter                                                          | GitHub Actions secret; observability owner                                                      | Scope read-only to the approved metrics source, verify stage evidence, and never print the response token                                                                                    |
| `PRODUCTION_RELEASE_EVIDENCE_TOKEN` | Restricted release-evidence secret | Alert/source-map/release evidence adapter                                                    | GitHub Actions secret; observability owner                                                      | Scope read-only to the approved evidence service, verify exact tag/SHA/version matching, and never print the response token                                                                  |
| `CLOUDFLARE_ANALYTICS_TOKEN`        | Restricted metrics secret          | Worker-side Workers Analytics Engine SQL queries                                             | Cloudflare Worker secret; platform owner                                                        | Scope to Account Analytics Read for this account, verify the protected metrics endpoint, and never expose the token to the browser                                                           |
| `RELEASE_METRICS_TOKEN`             | Restricted adapter secret          | Worker-side per-version metrics endpoint                                                     | Cloudflare Worker secret and matching GitHub Actions secret                                     | Generate independently from provider credentials, rotate after an incident, and never log the value                                                                                          |
| `RELEASE_EVIDENCE_TOKEN`            | Restricted adapter secret          | Worker-side release evidence endpoint                                                        | Cloudflare Worker secret and matching GitHub Actions secret                                     | Generate independently from provider credentials, rotate after an incident, and never log the value                                                                                          |

`SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_URL`, and `SENTRY_RELEASE` are build
identifiers/endpoints rather than credentials. Keep them in the build
environment when source-map upload is enabled, validate that the endpoint is
the intended Better Stack-compatible destination, and do not put secrets in
their values. `SENTRY_ENVIRONMENT` is an optional deployment label.

### Public configuration and non-secret variables

These values may be in `.env.example` and the browser bundle, subject to their
normal privacy and environment rules:

| Variables                                                                                                          | Purpose                                  | Source of truth / check                                                                              |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`, `VITE_SUPABASE_URL`                                                                                | Server and browser Supabase project URLs | Must point to the same branch; local values must be development, never production                    |
| `VITE_SUPABASE_ANON_KEY`                                                                                           | Browser Supabase public key              | Public by design; keep it paired with `VITE_SUPABASE_URL` and rely on RLS/app authorization          |
| `SUPABASE_ENVIRONMENT`, `SUPABASE_PRODUCTION_PROJECT_REF`                                                          | Environment safety labels                | Used by development seed guards; production project ref is comparison metadata, not a credential     |
| `APP_URL`                                                                                                          | Server-generated links and email URLs    | Must match the deployed origin for the target environment                                            |
| `RESEND_FROM`                                                                                                      | Email sender identity                    | Must be a verified Resend sender; no API credential belongs here                                     |
| `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION`                                                                 | Meta sender identifier and API version   | Must match the approved Meta Business Suite number and supported API version                         |
| `VITE_BETTER_STACK_DSN`, `VITE_SENTRY_DSN`                                                                         | Browser error transport DSNs             | Public bundle values; Better Stack is canonical and Sentry is rollback-only                          |
| `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`                                                                            | Optional browser product analytics       | Public project key/host; autocapture and session recording remain disabled by default                |
| `VITE_GOOGLE_ADS_ID`, `VITE_META_PIXEL_ID`                                                                         | Public marketing measurement identifiers | Confirm the IDs belong to the intended production properties                                         |
| `VITE_*_DASHBOARD_URL`                                                                                             | Admin observability links                | Public URLs only; exclude query-string tokens and private share links                                |
| `DEVELOPMENT_SEED_EMAIL`                                                                                           | Synthetic development account identifier | GitHub `development` variable or local `.env`; use an SMTP-approved test address                     |
| `PRODUCTION_RELEASE_ENABLED`, `CLOUDFLARE_VERSION_METRICS_QUERYABLE`                                               | Release safety switches                  | Protected GitHub repository variables; set true only after readiness evidence                        | Keep false until the readiness checklist, alert routing, affinity, source maps, and restore/rollback drills are complete |
| `CLOUDFLARE_WORKER_NAME`, `PRODUCTION_ORIGIN`, `CLOUDFLARE_VERSION_METRICS_URL`, `PRODUCTION_RELEASE_EVIDENCE_URL` | Production release routing               | Protected GitHub repository variables; public origin/name and approved metrics/evidence adapter URLs | Verify they point at `christ-dina`, the production custom domain, and the intended metrics/evidence services             |

### Protected production release controls

| Variable                                     | Protected source / owner                                         | Default              | Readiness check                                                                                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PRODUCTION_JOURNEY_PATHS`                   | Protected GitHub repository variable; release platform and QA    | No default; required | Provide a non-empty comma-separated list of approved public journey paths; validate each path before enabling production release, and require the affected journey smoke to pass. |
| `CLOUDFLARE_VERSION_HIGH_SEVERITY_QUERYABLE` | Protected GitHub repository variable; observability and platform | `false`              | Keep false until the exact-version high-severity query is proven against the approved Cloudflare metrics source; the gradual rollout guard must fail closed while false.          |
| `CLOUDFLARE_VERSION_AFFINITY_READY`          | Protected GitHub repository variable; Cloudflare platform owner  | `false`              | Set true only after the zone transform maps `dina-version-key` to `Cloudflare-Workers-Version-Key` and split-version HTML plus hashed-asset evidence is recorded.                 |
| `CLOUDFLARE_VERSION_AFFINITY_EVIDENCE_URL`   | Protected GitHub repository variable; Cloudflare platform owner  | No default; required | HTTPS link to the dated transform-rule and split-version asset verification evidence consumed by the readiness gate.                                                              |
| `ROLLOUT_STAGE_WAIT_SECONDS`                 | Protected GitHub repository variable; release platform           | `600` seconds        | Keep within the workflow-enforced 600–900 second range and verify that four rollout stages, smoke windows, and rollback fit the deploy timeout.                                   |

`VITE_APP_VERSION`, `VITE_SENTRY_ENVIRONMENT`, and `VITE_SENTRY_RELEASE` are
optional build metadata. `VITE_SITE_URL` appears only in a commented legacy
email helper and is not an active runtime contract; do not add it to a
deployment without first wiring it through `src/env.ts`.

## Storage map

| Surface                          | Store                                 | Current contract                                                                                                                                                                                                                                                                                                                               |
| -------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local development                | Ignored root `.env`                   | Development Supabase URL, database, service key, email, WhatsApp, and optional telemetry credentials only; copy names from `.env.example`                                                                                                                                                                                                      |
| Browser build                    | Vite `VITE_*` environment             | Public configuration only; inspect the generated bundle contract through `src/env.ts` and never put service-role, database, API, or triage tokens behind the prefix                                                                                                                                                                            |
| Cloudflare Worker                | Worker encrypted secrets and bindings | Set `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, `BETTER_STACK_DSN`, `BETTER_STACK_TELEMETRY_TOKEN`, `CLOUDFLARE_ANALYTICS_TOKEN`, `RELEASE_METRICS_TOKEN`, `RELEASE_EVIDENCE_TOKEN`, and any temporary `SENTRY_DSN` with `wrangler secret put`; keep `HYPERDRIVE` and `RELEASE_METRICS` as the production bindings |
| GitHub `development` environment | Actions secrets/variables             | Secrets: `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEVELOPMENT_SEED_PASSWORD`; variables: `SUPABASE_URL`, `SUPABASE_PRODUCTION_PROJECT_REF`, `DEVELOPMENT_SEED_EMAIL`                                                                                                                                                                      |
| GitHub `production` environment  | Actions secrets/variables             | Secret: `DATABASE_URL`; protect the environment with a wait timer and explicit approval before migration                                                                                                                                                                                                                                       |
| Notion                           | Engineering management pages          | Record only role ownership, status, evidence URL, and review date; never credential material                                                                                                                                                                                                                                                   |

The production release workflow consumes only the scoped Cloudflare deployment,
source-map, and per-version metrics credentials in its deploy job. Runtime
secrets remain in Cloudflare; migration jobs receive only `DATABASE_URL`.

## Account setup and rotation recipe

1. Assign a named human owner outside the repository for each role in the
   tables above: platform, database, email, communications, and observability.
   Record the owner and next review date in Notion, not the credential.
2. Inventory the live value in its provider dashboard and compare only its
   last-four-character fingerprint or creation date. Never copy the value into
   a ticket, log, screenshot, or Notion page.
3. Create the replacement credential before changing the application. For
   Better Stack, create or open the Errors application at
   `https://errors.betterstack.com/`; for Cloudflare, open the Worker at
   `https://dash.cloudflare.com/` → **Workers & Pages** → `christ-dina` → the
   target deployment → **Settings** → **Variables and Secrets**.
4. Update the correct environment store, deploy or rerun the narrow workflow,
   and verify the behavior that proves the secret is live. Do not print the
   environment or run `env` in CI logs.
5. Revoke the old credential only after verification. Record date, owner,
   provider, environment, evidence link, and next review date in the Notion
   Security page; record no secret value.
6. If verification fails, restore the previous value only through the provider
   secret store, investigate, and repeat the replacement. Do not commit a
   credential as a rollback shortcut.

### Better Stack acceptance checks

After `BETTER_STACK_DSN` and `VITE_BETTER_STACK_DSN` are configured:

- Trigger one controlled Worker error and one controlled browser error in a
  non-production environment first.
- Confirm the events appear in Better Stack Errors with `local`, `preview`, or
  `production` environment labels and the expected release.
- Confirm source maps symbolicate the deployed release without exposing answer
  text, applicant data, tokens, provider messages, or connection strings.
- Confirm Cloudflare Logs & Traces can be correlated using the logged
  `requestId`, `trace_id`, and `span_id` fields.
- Confirm the old Sentry fallback is not receiving normal traffic before
  removing its secret and compatibility settings.

Verification update — 2026-09-23: both DSN names are configured in their
intended stores, and controlled browser exceptions from the local
production-style build are visible in Better Stack Errors with a successful
ingestion response. Worker-side error delivery, source-map symbolication, and
alert verification remain open.

## Review cadence and evidence

- Review the inventory on every deployment-platform or provider change and at
  least quarterly while the Better Stack cutover is in progress.
- Review immediately after suspected exposure, staff departure, provider
  breach, environment mix-up, or unexplained telemetry ingestion.
- Evidence is a provider audit entry, GitHub environment audit entry, deployment
  URL, Better Stack event/release URL, or redacted verification note. Never
  attach raw `.env` files, CI logs containing values, or complete DSNs/tokens.

The remaining external work is to replace role placeholders with named owners,
verify the live stores for development and production, perform one controlled
rotation, and record the redacted evidence in Notion.
