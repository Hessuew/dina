# DINA Application Threat Model

**Status:** Drafted — repository baseline complete; hosted controls and
account-level verification remain external follow-up
**Phase:** Engineering Roadmap Phase 5: Security
**Owner:** Engineering

## Purpose and scope

This is the repository-owned threat-model baseline for the DINA school
platform. It records the assets, trust boundaries, abuse cases, current
controls, and residual actions that must be revisited when routes, database
tables, authentication flows, or external integrations change.

The model covers:

- public enrollment, invitation, authentication, password reset, and email
  verification flows;
- authenticated student, teacher, and Admin application workflows;
- private storage and signed object access;
- the Cloudflare Worker, Hyperdrive/Postgres connection, Supabase Auth,
  Supabase Storage, Resend, Meta WhatsApp Cloud API, Better Stack, PostHog,
  GitHub Actions, and deployment configuration; and
- operational failure, recovery, and evidence handling.

This document does not claim that provider configuration has been verified.
Account-specific dashboard URLs, credentials, firewall rules, alert routes,
and restore evidence belong in the external systems and the linked runbooks.

## Actors and assets

| Actor or asset                                                                 | Classification              | Security objective                                                                                              |
| ------------------------------------------------------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Anonymous applicant                                                            | Untrusted external actor    | May submit only the intentionally public enrollment payload                                                     |
| Authenticated student                                                          | User-controlled identity    | May access only published/enrolled learning data and own submissions, progress, attendance, and notifications   |
| Authenticated teacher                                                          | Privileged application role | May access assigned course data and permitted review, attendance, discipleship, and content-management actions  |
| Admin                                                                          | Highest application role    | May perform explicitly administrative enrollment, staff, course, invitation, campaign, and privilege operations |
| Supabase Auth session/cookies                                                  | Restricted                  | Authenticate the caller; never expose service credentials                                                       |
| Applicant contact details and application text                                 | Sensitive                   | Keep out of telemetry and unauthorized staff/student views                                                      |
| Exam answers, grades, feedback, mentorship, and enrollment evaluations         | Restricted                  | Enforce role, ownership, assignment, and course boundaries                                                      |
| Zoom links, private storage objects, signed URLs, and invitation/reset tokens  | Restricted                  | Prevent enumeration, leakage, replay, and unauthorized download                                                 |
| Service-role keys, database URLs, delivery/API tokens, and Better Stack tokens | Restricted secret           | Keep in Worker/GitHub/local secret stores; never bundle or log                                                  |
| Logs, traces, analytics events, and operational evidence                       | Internal                    | Useful for diagnosis without copying private content or credentials                                             |

## Trust boundaries

1. **Browser to Worker.** The browser controls input, navigation, and public
   configuration. The Worker must treat all payloads and client-side role
   claims as untrusted, validate inputs, establish the Supabase session, and
   authorize each server function.
2. **Worker to Supabase Auth.** The server Supabase client reads the request
   cookie session using the public anon key. The Admin client uses the service
   role only for server-side administrative operations and is never imported
   by browser code.
3. **Worker to Postgres through Hyperdrive.** Drizzle queries execute on the
   server connection. Application authorization is the active enforcement
   boundary for this path. Legacy tables are not yet safe to treat as
   request-context-aware RLS because direct database connections do not
   automatically populate Supabase auth.uid().
4. **Worker to private storage.** Storage object names are derived server-side
   and private objects are returned through short-lived signed access. Object
   paths and provider error details are not operational telemetry.
5. **Worker to external delivery providers.** Resend and Meta receive only the
   fields required for the requested delivery. Provider failures are
   categorized before logging and delivery remains best effort where the
   product contract says so.
6. **Worker to observability providers.** Better Stack receives
   Sentry-compatible application errors and redacted structured events;
   Cloudflare telemetry supplies Worker logs/traces; PostHog receives an
   allow-listed browser journey event set. Neither path may receive
   passwords, tokens, raw content, or unnecessary contact data.
7. **GitHub Actions and deployment providers.** CI can run migrations, seed
   synthetic development data, and deploy the reviewed Worker. Environment
   separation, protected production approval, and least-privilege secrets
   are required before production operation.

## Threat register

| ID    | Threat and impact                                                                                                           | Current controls and evidence                                                                                                                                                                                                                                                                                                                                              | Residual action                                                                                                                                                          |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TM-01 | Broken object-level authorization exposes another student's submission, enrollment, progress, or private content            | Server functions call getCurrentUser; shared authz checks roles, ownership, course teachers, and resource relationships; student-directory services enforce staff access before reads; post read services require a persisted profile; focused integration tests cover recent calendar, moderation, substitution, teacher-directory, student-directory, and post-read gaps | Continue route/server-function review whenever a read or mutation is added; add a negative integration case for every new sensitive resource                             |
| TM-02 | A student escalates to teacher/Admin through a forged role, stale profile, or staff-privilege mutation                      | Roles are read from the persisted profile; staff privileges are Admin-only; service functions do not trust client role values; authz regression tests exist                                                                                                                                                                                                                | Review all profile/admin mutations after schema changes and keep the threat-model checklist in the PR/release review                                                     |
| TM-03 | Public enrollment, OTP, reset, invitation-token, or email-check endpoints are abused for enumeration, spam, or token replay | Zod input validation, cooldown/state checks, short-lived token semantics, generic account-missing behavior, and closed enrollment flag are implemented                                                                                                                                                                                                                     | Configure provider and edge rate limits; verify abuse thresholds and alerting against synthetic requests without collecting applicant data                               |
| TM-04 | Service-role key, database URL, delivery token, or Better Stack token reaches the browser, repository, or logs              | Typed server/client environment split, ignored local env, Worker/GitHub secret inventory, redacted logger, and Better Stack acceptance procedure are documented in SECRET_INVENTORY.md                                                                                                                                                                                     | Perform the first controlled rotation and secret-exposure review in the external stores; keep old values revocable during cutover                                        |
| TM-05 | Logs, traces, or product analytics leak PII, private content, credentials, or provider errors                               | Structured logger recursively redacts sensitive field names; event families use stable IDs/categories; PostHog autocapture and recording are disabled; focused tests assert exclusions                                                                                                                                                                                     | Verify live Better Stack and PostHog events with synthetic values, then review new event fields at each integration change                                               |
| TM-06 | Storage path traversal, object enumeration, or long-lived signed URLs expose private files                                  | Server-side path construction, private buckets, signed access, persisted-profile checks on avatar upload services, and cleanup/signing warning categories are used; storage tests cover upload and signing paths                                                                                                                                                           | Confirm bucket policies, signed URL lifetime, and direct-object denial in the Supabase/Cloudflare environments                                                           |
| TM-07 | Stored lesson, post, assignment, or profile input becomes executable content                                                | React rendering remains the default output path; URL and file inputs are schema-validated in feature boundaries; raw HTML is not part of the documented content contract                                                                                                                                                                                                   | Review any future HTML/Markdown renderer, rich-text editor, or user-controlled URL feature before enabling it; add sanitization tests at that boundary                   |
| TM-08 | Cross-site requests invoke a state-changing server function                                                                 | Start registers CSRF middleware for server functions; mutations use POST and server functions establish authentication; expected failures use typed errors                                                                                                                                                                                                                 | Keep CSRF middleware first in the request chain and add a cross-origin regression check if transport configuration changes                                               |
| TM-09 | Delivery-provider failure, retry, or concurrent campaign execution causes duplicate or misleading communication             | Email/WhatsApp campaign locks, idempotent persistence, bounded result counters, failure isolation, and redacted campaign telemetry are implemented                                                                                                                                                                                                                         | Verify provider idempotency and alert routing using an approved test recipient/template; never use real applicant data for rehearsal                                     |
| TM-10 | Dependency or build-tool compromise reaches the deployed bundle or CI                                                       | Weekly Bun audit, Dependabot, patched direct PDF.js and nested Vite/shell-quote resolutions, and report-only triage are documented in SECURITY.md                                                                                                                                                                                                                          | Triage remaining transitive findings by reachability, upgrade/replace/isolate/accept decision, owner, and review date; promote audit to blocking after baseline approval |
| TM-11 | Migration, restore, or deployment rollback causes data loss or an incompatible application/database pair                    | Expand/contract procedure, migration replay tests, protected promotion order, application rollback guidance, and isolated restore runbook exist                                                                                                                                                                                                                            | Run the first hosted development restore and non-production rollback rehearsal; attach only redacted evidence to the release/readiness record                            |
| TM-12 | Unbounded reads or request floods exhaust Worker, database, or provider capacity                                            | Cursor pagination and additive query indexes cover the reviewed high-value reads; readiness checks fail closed; campaign locks bound concurrent sends                                                                                                                                                                                                                      | Capture hosted query plans and production request data before changing limits; choose edge/app rate limits and caching as measured follow-up work                        |
| TM-13 | RLS policies drift from application authorization and provide false confidence or unexpected denial                         | Exam, attendance, invitation, evaluation, staff-privilege, storage-related, and other newer tables have explicit migration policies; the database README and security plan identify app authz as active boundary                                                                                                                                                           | Inventory current table/policy state in each Supabase branch, model request identity propagation, then migrate legacy tables only with an executable policy/test plan    |
| TM-14 | Better Stack, Cloudflare, PostHog, Supabase, or GitHub configuration is incomplete while the repository appears healthy     | Repository-owned handoff and runbooks name required URLs, monitors, dashboards, owners, smoke checks, and rollback steps                                                                                                                                                                                                                                                   | Complete account setup, controlled error/trace/analytics checks, alert delivery checks, named ownership, and Notion status updates                                       |

### Public-endpoint abuse controls (Cloudflare WAF)

The application keeps enrollment closed (`ENROLLMENT_OPEN = false`) until the
public-flow controls are verified. The public surfaces that need an edge policy
are the signup/OTP flow, password-reset flow, invitation-token and invitation
email checks, email-change verification, and any future enrollment opening.
The TanStack server-function names are not assumed to be URI paths: operators
must first use Cloudflare Security Analytics and the `serverFn:*` structured
events to map the browser action to the actual request path.

The repository-owned execution recipe is in
[`GNHF-10.9.206.md`](../../GNHF-10.9.206.md#iteration-100--cloudflare-waf-public-endpoint-abuse-control-runbook).
It covers the `christ-dina.org` zone, `/healthz` and `/readyz` exclusions,
log-first rollout, IP-based characteristics for public traffic, generic 429
responses, Better Stack alert evidence, synthetic verification, and reversible
rule rollback. This is an external Cloudflare configuration change; this slice
does not commit a Cloudflare API token, rule ID, or Wrangler application code.

### Calendar event mutation boundary

The event-management route redirects students, and the event service now
enforces the same teacher/Admin boundary for listing and create/update/delete
operations. The negative integration test calls each mutation directly and
confirms authorization fails before persistence.

### Post read boundary

The post route authenticates the caller, and the post channel, feed, single-post,
and comment services now require the authenticated actor's persisted profile
before querying community data. Integration coverage calls each service with an
unknown actor and confirms the read is rejected before the repository path.

### Post mutation boundary

Post and comment create, update, delete, and reaction services now require the
actor's persisted profile before any community read or write. Ownership and
Teacher/Admin moderation checks remain in place after that identity check.
Integration coverage confirms unknown actors are rejected before mutation
repository calls.

### Post-notification boundary

The notification summary and mark-read services now require the actor's
persisted profile before reading notification groups or changing read state.
Integration coverage calls all three service operations with an unknown actor
and confirms they fail before notification queries or updates.

### Lesson read boundary

The lesson detail service now rejects unpublished lessons for students and
teachers who do not manage the course. For published lessons, non-managers
receive only published assignments; course teachers and admins retain the full
authoring view. Integration coverage verifies student denial, server-side
assignment filtering, and course-teacher draft access.

### Private avatar storage boundary

Avatar upload request and completion services require a persisted profile
before minting an actor-owned signed upload or persisting an avatar path.
Unknown direct callers therefore fail before the service-role storage client is
used; integration coverage exercises both request and completion paths.

### Media-library service boundary

Media-library reads, CRUD mutations, and private upload helpers resolve the
caller's role from the persisted profile inside the service. Adapters pass only
the authenticated user ID, preventing direct callers from forging a role to
bypass unpublished-media filtering or staff/ownership checks. Integration
coverage rejects unknown actors before media reads and preserves persisted
student/teacher behavior.

### Campaign lock service boundary

Email and WhatsApp campaign lock inspection and explicit release now run
through Admin-guarded services instead of calling repositories directly from
the server-function adapters. This keeps lock cleanup under the same role
boundary as campaign preview and send; integration coverage rejects teacher
callers and verifies Admin cleanup behavior.

### Exam-taking service boundary

Student exam listing, attempt lifecycle, answer autosave, and submission paths
require the caller's persisted `student` role before reading published exams or
writing attempt state. The authorization check rejects unknown direct callers
as well as teacher/Admin users; integration coverage exercises the student
listing and attempt-start boundaries.

## Existing control map

| Control                | Repository evidence                                                                   | Verification boundary                                   |
| ---------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Authentication         | src/utils/auth/auth.ts, src/routes/_authed.tsx, auth integration suites               | Server function and route boundary                      |
| Authorization          | src/utils/authz, src/utils/*/service, focused negative integration tests              | Resource, role, ownership, and persisted-profile checks |
| CSRF                   | src/start.tsx and request middleware                                                  | Same-origin server-function transport                   |
| Input validation       | src/schemas and createServerFn inputValidator usage                                   | Every public or state-changing payload                  |
| Secret separation      | src/env.ts, .env.example, docs/plan/SECRET_INVENTORY.md                               | Build, Worker, GitHub, and local environments           |
| Privacy-safe telemetry | src/utils/observability/logger.ts, src/utils/analytics.ts, structured telemetry tests | Better Stack/Cloudflare/PostHog payloads                |
| Private storage        | src/utils/storage, src/utils/imageUpload, storage migration policies                  | Supabase bucket/object boundary                         |
| Safe delivery          | docs/plan/SAFE_DELIVERY.md, GitHub workflows, smoke:health                            | CI, migration, deploy, and rollback sequence            |
| Recovery               | docs/database-backup-restore-runbook.md, docs/observability-runbook.md                | Hosted restore and incident rehearsal                   |

## Review contract

Revisit this model:

- before adding a public endpoint, server function, database table, external
  integration, storage bucket, role, or telemetry event;
- after an authorization, migration, provider, or incident change;
- during each production-readiness review; and
- at least quarterly while Phase 5 remains open.

The reviewer should identify the new asset and boundary, add or update a
threat-register row, name a tested repository control, and record any external
verification in the linked Notion risk/readiness record. A threat-model update
does not authorize enabling RLS, changing rate limits, disabling old telemetry,
or rotating credentials without the corresponding migration or provider
procedure.

## Priority follow-up

1. Complete the live Better Stack/Cloudflare/PostHog acceptance checks and
   record redacted evidence.
2. Run the first hosted restore and non-production rollback rehearsals.
3. Finish the remaining RBAC/RLS review with a request-identity-aware policy
   plan before enabling policies on legacy tables.
4. Apply the Cloudflare WAF public-endpoint recipe in
   `GNHF-10.9.206.md`, then verify the staged policy with synthetic requests and
   record the rule IDs, thresholds, exclusions, and alert evidence.
5. Triage and assign the remaining dependency advisories.

Related repository procedures:

- [Security baseline](./SECURITY.md)
- [Runtime and CI secret inventory](./SECRET_INVENTORY.md)
- [Safe delivery and migration operations](./SAFE_DELIVERY.md)
- [Observability runbook](../observability-runbook.md)
- [Database backup and restore runbook](../database-backup-restore-runbook.md)
