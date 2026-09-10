# GNHF-10.9.206 — Engineering roadmap implementation handoff

**Date:** 2026-09-11
**Iteration:** 17
**Scope:** add request-correlated redacted audit telemetry for Admin
staff-privilege grants and revokes.

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
- Assignment submission saves now emit structured Better Stack/Cloudflare-ready
  outcome events with request ID, status, duration, and stable error category.
- Signup and OTP flows now emit the same safe event shape for delivery,
  provisioning, rollback, verification, auto-login, and resend outcomes.
- The admin invitation-email campaign now emits safe per-invitation delivery
  outcomes, campaign completion summaries, and lock-release failures with
  request correlation and stable error categories.
- Teacher grading now emits a request-correlated completion event with stable
  status, duration, assignment, submission, and actor identifiers.
- Enrollment evaluation score, admission-category, and note mutations now emit
  one redacted completion event shape with request correlation, status, duration,
  enrollment/evaluator identifiers, action path, and field type.
- Student exam-attempt submission now emits redacted completion, idempotent
  no-op, and unexpected-finalization failure events with request correlation,
  outcome status, duration, attempt/exam/student identifiers, and submission
  mode. Answer text and scores are excluded.
- The admin WhatsApp campaign now emits redacted per-message delivery outcomes,
  campaign completion summaries, and lock-release failures with request
  correlation and stable error categories. Recipient phone numbers, names, and
  provider error text are excluded.
- Post/comment notification persistence failures now emit a redacted
  `notification_delivery_failed` event with request correlation, notification
  type, recipient count, duration, and a stable error category. Best-effort
  delivery semantics are unchanged.
- Student attendance check-ins now emit redacted completed, idempotent-retry,
  and unexpected-failure events with request correlation, safe
  course/session/lesson/student identifiers, status, duration, and a stable
  error category. Closed-window validation remains an expected user-facing
  outcome.
- Profile updates and email-change verification now emit redacted success and
  failure events with request correlation, user ID, status, duration, and
  stable persistence/provider categories. Email addresses, verification tokens,
  and provider messages are excluded.
- Admin staff-privilege grants and revokes now emit redacted audit events with
  request correlation, actor/target IDs, privilege name, grant direction,
  duration, and a stable persistence-failure category.

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

The in-repo structured-logging baseline now has a shared server logger. It
emits stable JSON fields to the Worker console and recursively redacts tokens,
credentials, connection strings, cookies, email/phone values, request bodies,
and raw error messages. The health and readiness endpoints, assignment
submission persistence, signup/OTP flows, invitation-email campaign, password
reset, teacher grading, enrollment evaluation, private image storage, exam
submission, WhatsApp campaign, post/comment notification delivery, and student
attendance check-in are consumers; broader server-function migration remains
intentionally incremental.

No secrets, account tokens, or account-specific URLs belong in this file or in
the repository.

## Initial Better Stack handoff foundation

- Captured the Better Stack replacement decision and the staged cutover plan.
- Documented exact dashboard navigation, source creation, Cloudflare
  destination values, health monitors, dashboards, alerts, verification, and
  rollback steps.
- Recorded which roadmap work is already implemented, which work is pending,
  and which work requires an authenticated Better Stack, Cloudflare, Supabase,
  Slack, or Notion dashboard action.

The account-specific Better Stack application DSN, Telemetry source token/host,
and Cloudflare destination names are external account values. They must be
created in the provider dashboards and injected through deployment secrets;
they do not belong in the repository.

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

## Iteration 4 — shared redacted structured server logger

This iteration completed the next smallest Phase 1 structured-logging slice:

- Added `src/utils/observability/logger.ts` with `info`, `warn`, and `error`
  levels, stable event names, JSON output, recursive nested-field redaction,
  safe `Error` serialization, and BigInt handling.
- Migrated `/healthz` and `/readyz` logging off their local console formatter
  and onto the shared helper. Their existing event names and operational fields
  remain unchanged.
- Added focused tests for console-level selection, nested redaction, and raw
  error-message suppression.
- Updated `docs/plan/STRUCTURED_LOGGING.md` and `src/utils/README.md` to mark
  the shared helper and health migration complete. The next slice is one
  high-value server-function family at a time, starting with stable event,
  request, status, and duration fields.

Validation for this iteration: focused health/logger tests (8 passing),
TypeScript typecheck, and targeted Prettier checks pass. The full
`bun run quality:gate` also passed after the local documentation stabilized;
Notion synchronization completed afterward.

## Iteration 5 — request correlation and assignment submission events

This iteration migrated the next high-value server-function slice:

- Added an ambient request context that derives correlation IDs from `cf-ray`,
  `x-request-id`, or a generated UUID and preserves the outer ID through nested
  request/function middleware.
- Reused the request context in health/readiness code so request ID extraction
  has one implementation.
- Replaced assignment submission persistence `console.error` output with the
  shared redacted logger. Successful saves and persistence failures now carry
  `requestId`, `path`, `status`, `durationMs`, assignment/user IDs, and the
  stable `submission_persistence` error category.
- Expected authorization, not-found, and validation failures remain outside
  this error event, avoiding noisy error logs for normal user input failures.

Validation completed with focused request-context, health, and logger tests,
targeted formatting, typecheck, `bun run quality:gate` (1,926 unit tests), and
`bun run test:integration` (316 integration tests). The default `bun test`
invocation is not the correct Cloudflare integration entrypoint because it does
not load the integration config aliases; use the repository integration script
for that lane. The next code slice is another high-value server-function
family, likely enrollment or auth, after the assignment event shape is
observed in Better Stack.

## Iteration 6 — signup and OTP structured events

This iteration migrated the auth/signup family’s operational failures and key
success outcomes to the shared redacted logger:

- Signup OTP delivery emits `signup_otp_sent` or
  `signup_otp_email_failed`; stale-OTP cleanup failures are separately
  reported as `signup_otp_cleanup_failed`.
- OTP verification emits `signup_verified` and records stable failure
  categories for auth-user creation, duplicate-user confirmation, profile
  persistence, user rollback, and post-verification auto-login.
- OTP resend emits `signup_otp_resent` or `signup_otp_resend_failed`.
- Every event carries the request ID, `serverFn:<action>` path, outcome status,
  elapsed duration, and only safe identifiers/provider codes. Passwords,
  emails, OTPs, request bodies, and raw provider errors are not logged.
- Expected invalid invitations, expired/cooldown codes, and incorrect OTPs
  remain ordinary user-facing outcomes and do not create noisy error events.

Validation completed with 16 signup integration tests, 28 focused
observability/signup-domain tests, formatting, and TypeScript validation. The
next structured-logging slice remains enrollment or teacher review; Better Stack
destination and dashboard verification remains an external account task
described below.

## Iteration 7 — admin invitation-email campaign structured events

This iteration migrated the next high-value admin workflow to the shared
redacted logger:

- Successful and failed invitation deliveries emit stable events with the
  request ID, server-function path, campaign, enrollment/invitation IDs,
  outcome status, elapsed time, actor ID, and invitation action.
- Completed campaigns emit sent/failed/skipped counts. Partial failures are
  marked as `partial_failure` so an otherwise completed batch remains visible
  without treating expected per-recipient failures as an unhandled request.
- Lock-release failures emit a separate
  `email_campaign_lock_release_failed` event with the stable
  `campaign_lock_release` category.
- Provider exception text is not copied into structured logs; existing email
  audit rows retain their prior behavior.

Validation: the email-campaign integration suite now includes a redaction
assertion for provider failures. `bun run quality:gate` passed with 1,926 unit
tests, and `bun run test:integration` passed with 317 integration tests.

## Iteration 8 — password-reset structured events

This iteration completed the next auth-family slice in the shared redacted
logger:

- Password-reset email delivery emits `password_reset_email_sent` or
  `password_reset_email_failed` with request ID, server-function path, status,
  duration, user ID, and the stable `password_reset_email_delivery` category
  on failure.
- Password updates emit `password_reset_completed` or
  `password_reset_update_failed`. Provider codes are retained for diagnosis,
  while provider messages, reset tokens, and new passwords are not logged.
- Existing anonymous-account, cooldown, invalid-token, and validation outcomes
  remain ordinary user-facing results rather than noisy error events.
- Integration coverage verifies reset-state cleanup, failed-attempt counting,
  event shape, and redaction of provider/password values.

Validation: the password-reset integration suite passed all 5 tests after the
structured logging migration. `bun run quality:gate` passed with 1,926 unit
tests, and `bun run test:integration` passed with 319 integration tests.

## Iteration 9 — teacher grading structured event

This iteration completed the next teacher-review slice in the shared logger:

- Successful assignment grading emits `assignment_grading_completed` with
  request ID, server-function path, `graded` status, duration, assignment ID,
  submission ID, and grader ID.
- Feedback text, grades beyond the stable outcome, and provider/database error
  details are not copied into the event. Expected authorization, missing-record,
  and cross-assignment validation failures remain ordinary service errors.
- Integration coverage verifies the event shape and confirms duration is
  present while the existing persisted grade assertions remain intact.

The next structured-logging slice remains enrollment evaluation or another
high-value mutation after this event shape is observed in Better Stack. The
external Better Stack destination, dashboard, alert, and source-map checks
remain pending account setup described below.

## Iteration 10 — enrollment evaluation structured events

This iteration completed the next enrollment-review slice in the shared logger:

- Score, admission-category, and note mutations emit
  `enrollment_evaluation_updated` with request ID, server-function path,
  `updated` status, duration, enrollment ID, evaluator ID, and an
  `evaluationField` discriminator.
- The score, admission category, and note values are intentionally excluded;
  note text is private mentorship content and must not reach Better Stack or
  Cloudflare logs.
- Integration coverage verifies the event shape, duration, all three field
  variants, and absence of evaluation values/note text.

Validation for this iteration: focused enrollment integration tests, formatting,
typecheck, and `bun run quality:gate` passed. Better Stack destination,
dashboard, alert, and source-map checks remain pending external account setup.

## Iteration 11 — private image/storage structured events

This iteration completed the next storage-backed mutation slice in the shared
redacted logger:

- Avatar and course-thumbnail signed-upload requests and completion actions now
  emit `image_upload_completed` or `image_upload_failed` with request ID,
  server-function path, status, duration, bucket, and safe actor/course IDs.
- Best-effort old-object cleanup and batched private-storage URL signing now
  emit stable warning events with bucket, count, and error-category fields;
  storage paths and provider messages are excluded.
- Expected validation, authorization, and missing-course failures remain out
  of noisy error logging.
- Focused integration/unit coverage verifies event shape, failure categories,
  and provider-message/path redaction.

Validation for this iteration: image-upload integration tests (10), private
storage unit tests (5), full unit tests (1,926), full integration tests (324),
`bun run quality:gate`, and `bun run build` passed. Notion Architecture
Inventory, Service Catalog, Observability, and Engineering Roadmap records were
synchronized; external Better Stack destination verification remains pending.

## Iteration 12 — exam attempt submission structured events

This iteration completed the next high-value student workflow slice in the
shared logger:

- Successful student exam submission emits `exam_attempt_submitted` with
  request ID, server-function path, final attempt status, duration, attempt/
  exam/student identifiers, and whether the submission was manual or caused by
  the deadline.
- Repeated submission of an already finalized attempt emits
  `exam_attempt_submission_ignored` with `already_finalized` status, making
  idempotent client retries visible without treating them as failures.
- Unexpected errors during auto-grading/finalization emit
  `exam_attempt_submission_failed` with a stable error category. Expected
  authorization, not-found, and validation errors remain outside noisy logs.
- Answer text and score values are never copied into telemetry.

Validation: the exam integration suite verifies event shape, request path,
duration, idempotent retry visibility, and answer redaction. Better Stack
destination, dashboard, alert, and source-map checks remain pending external
account setup.

## Iteration 13 — WhatsApp campaign structured events

This iteration completed the next high-value admin workflow slice in the shared
logger:

- Successful and failed WhatsApp message deliveries emit stable events with
  request ID, server-function path, campaign/template, enrollment and actor
  identifiers, outcome status, duration, and a stable
  `whatsapp_message_delivery` error category on failure.
- Completed campaigns emit sent/failed/skip counters, including a
  `partial_failure` status when individual provider deliveries fail; the safe
  counters are flattened so the defensive phone-key redaction does not mask
  useful metrics.
- Campaign lock-release failures emit a separate
  `whatsapp_campaign_lock_release_failed` event. Provider exception text stays
  in the existing database audit row but is no longer written to console logs,
  so it cannot flow to Better Stack through Cloudflare telemetry.
- Integration coverage verifies event shape and confirms provider error text,
  recipient names, and phone data are not copied into structured events.

Validation: the WhatsApp integration suite passed all 14 tests, including the
new structured-event redaction test. Better Stack destination, dashboard,
alert, and source-map checks remain pending external account setup.

## Iteration 14 — notification delivery structured event

This iteration migrated the remaining raw notification persistence failure log
in the shared notification delivery adapter:

- Failed `post_created` and `comment_created` notification inserts now emit
  `notification_delivery_failed` through the redacted logger with request ID,
  `notifications:deliver` action path, failure status, duration, notification
  type, recipient count, and stable `notification_delivery` category.
- The adapter still swallows persistence failures intentionally so notification
  fan-out remains best effort and does not fail the originating post/comment
  mutation.
- Database/provider exception text is not passed to the logger and therefore
  cannot flow to Better Stack through Cloudflare telemetry.
- Focused unit coverage verifies row creation, failure swallowing, event shape,
  and secret/error-message exclusion. The existing notification integration
  suite remains green.

Validation: focused notification adapter tests, notification integration tests,
typecheck, formatting, and `bun run quality:gate` passed (1,928 unit tests).
Better Stack destination, dashboard, alert, and source-map checks remain
pending external account setup. Notion Architecture Inventory, Structured
server logging, Observability, and Engineering Roadmap records were
synchronized; Production Readiness was not changed because this slice did not
alter a launch decision.

## Iteration 15 — student attendance check-in structured events

This iteration migrated the student attendance check-in mutation to the shared
redacted logger:

- New attendance check-ins emit `attendance_check_in_completed` with request
  correlation, `serverFn:markPresent`, `checked_in` status, duration, and safe
  course/student/session/lesson identifiers.
- Repeated check-ins emit `attendance_check_in_ignored` with
  `already_present` status, making idempotent client retries visible without
  treating them as failures.
- Unexpected attendance persistence errors emit
  `attendance_check_in_failed` with the stable `attendance_check_in` category;
  raw database/provider details are not copied to structured telemetry.
- Closed attendance windows and non-student callers remain expected user-facing
  outcomes and do not create noisy error events.
- Integration coverage verifies both success/idempotent event shapes and
  duration fields.

Validation for this iteration: the focused attendance integration suite passed
all 17 tests; the full integration suite passed 325 tests; typecheck,
formatting, the full quality gate (1,928 unit tests), and the production build
passed. Better Stack destination, dashboard, alert, and source-map verification
remain pending external account setup.

## Iteration 16 — profile and email-change structured events

This iteration migrated the profile mutation and email-change verification
workflow to the shared redacted logger:

- Basic profile updates emit `profile_updated` with request correlation,
  `serverFn:updateProfile`, `success` status, duration, user ID, and a basic
  update discriminator.
- Email-change requests emit `email_change_requested`; persistence and
  verification-email delivery failures emit `email_change_request_failed` with
  stable categories. The existing token cleanup and error behavior remain
  unchanged.
- Successful verification emits `email_change_completed`; Supabase auth
  update and final persistence failures emit stable failure events with a
  provider code or error category.
- Email addresses, verification tokens, and raw provider messages are not
  passed to structured telemetry.

Validation for this iteration: focused profile integration coverage verifies
success/failure event shapes and redaction. Better Stack destination,
dashboard, alert, and source-map verification remain pending external account
setup.

## Iteration 17 — staff-privilege audit events

This iteration completed one security-sensitive structured-logging slice:

- Admin grants and revokes of Teacher-user staff privileges now emit
  `staff_privilege_updated` with request correlation, server-function path,
  success status, duration, actor ID, target user ID, privilege, and grant
  direction.
- Persistence or result-read failures emit `staff_privilege_update_failed`
  with the stable `staff_privilege_persistence` category without copying raw
  database/provider details into telemetry.
- Authorization and invalid-target failures remain expected access/user-input
  outcomes and are not logged as noisy operational failures.
- Integration coverage verifies both grant and revoke audit event shapes.

Validation for this iteration: the focused staff-privilege integration suite
passed all 4 tests. Better Stack destination, dashboard, alert, and source-map
verification remain pending external account setup.

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
build pipeline exposes it. The existing browser and Worker initializers now
accept those explicit `environment` and `release` values; the remaining action
is to configure and verify them with the real Better Stack DSN.

### 2. Configure source maps and releases

Open `Errors → Applications → christ-dina → Advanced settings` and copy the
Better Stack values for:

- Better Stack team ID used as `SENTRY_ORG`.
- Better Stack application ID used as `SENTRY_PROJECT`.
- Better Stack source-map endpoint used as `SENTRY_URL`.
- A Better Stack Telemetry API token used as `SENTRY_AUTH_TOKEN` for build
  upload only.

The repository uses the Sentry Vite plugin in `vite.config.ts`. Better Stack
documents that the existing Sentry source-map upload integration can be reused
by pointing it at Better Stack. The current build configuration now:

1. Read `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_URL` from build
   environment instead of keeping the organization/project hardcoded.
2. Keep `SENTRY_AUTH_TOKEN` available only to the build/source-map step.
3. Never expose that token through `VITE_*` variables or Worker runtime
   bindings.
4. The remaining external verification is to upload source maps for a preview
   release first, trigger one controlled test error, and confirm the stack is
   symbolicated in Better Stack.

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
| Structured logging    | Shared redacted JSON logger is used by health endpoints; broad server logs still use ad-hoc console calls              | Migrate one high-value server-function family at a time                                 |
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
