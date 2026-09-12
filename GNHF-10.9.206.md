# GNHF-10.9.206 — Engineering roadmap implementation handoff

**Date:** 2026-09-12
**Iteration:** 118
**Scope:** add redacted Better Stack-ready telemetry for assignment lesson,
detail, list, and submission reads and record the remaining hosted observability
evidence gate.

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
- Browser and Worker error events now include active OpenTelemetry trace and
  span identifiers when available, allowing Better Stack Errors to link into
  Cloudflare Logs & Traces.
- Better Stack is now the canonical error DSN configuration: the browser reads
  `VITE_BETTER_STACK_DSN` and the Worker reads the `BETTER_STACK_DSN` secret.
  The old Sentry-named DSNs remain explicit rollback fallbacks only, and no
  provider DSN is committed in `wrangler.jsonc`.
- The high-severity dependency-audit baseline is now clear: the unused local
  `shadcn` CLI dependency was removed, and compatible `picomatch` 4.x branches
  are pinned to `^4.0.7`. Generated `components.json` and checked-in UI sources
  remain unchanged; future component generation can use `bunx --bun
shadcn@latest` intentionally.
- The dependency-security GitHub workflow now blocks pull requests, main pushes,
  and scheduled/manual audits when `bun audit --audit-level=high` finds a high or
  critical advisory, while still uploading the JSON report for triage.
- The remaining moderate `srvx` advisory is now resolved by a compatible root
  `^0.11.13` override; the audit report retains only lower-severity findings for
  routine review, and the high/critical CI threshold remains clear.
- The remaining moderate `@humanfs/node` advisory is now resolved by a compatible
  root `^0.16.8` override; ESLint's existing `^0.16.6` range remains satisfied,
  and the audit report retains only the separate `esbuild` and `@babel/core`
  findings for routine review.
- Assignment submission saves now emit structured Better Stack/Cloudflare-ready
  outcome events with request ID, status, duration, and stable error category.
- Enrollment distribution and teacher substitution mutations now emit
  structured Better Stack/Cloudflare-ready completion and failure events with
  safe actor/teacher/course identifiers, assignment counters, request ID,
  status, duration, and stable error categories.
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
- Media-thumbnail completion now emits redacted
  `media_thumbnail_uploaded` / `media_thumbnail_upload_failed` events with
  request correlation, actor/media IDs, replacement and signing outcomes,
  status, duration, and the stable `media_thumbnail_persistence` category;
  thumbnail paths and provider error text are excluded.
- Calendar overview reads now emit redacted `calendar_events_loaded` events
  with request correlation, actor ID, source counts, total event count,
  status, and duration. Unexpected read failures emit
  `calendar_events_load_failed` with the stable
  `calendar_read_persistence` category; calendar content, locations, links,
  and timestamps are excluded.
- Student-directory list and detail reads now emit redacted
  `student_directory_loaded` / `student_directory_load_failed` events with
  request correlation, actor and target IDs where applicable, safe result
  counts, duration, and the stable `student_directory_read_persistence`
  failure category; student names, emails, bios, and assignment content remain
  excluded.
- Teacher-directory list reads now emit redacted
  `teacher_directory_loaded` / `teacher_directory_load_failed` events with
  request correlation, actor ID, safe result counts, duration, and the stable
  `teacher_directory_read_persistence` failure category; teacher names, email
  addresses, bios, and privilege details remain excluded.
- Assignment lesson/detail, student/teacher list, submission-count, and
  submission-list reads now emit redacted `assignment_read_loaded` /
  `assignment_read_failed` events with request correlation, actor IDs, safe
  lesson/assignment IDs, role/scope, publication/status metadata, and result
  counts. Assignment titles, lesson content, student identity, submission
  text, grades, feedback, and raw persistence details remain excluded;
  unexpected failures use the stable `assignment_read_persistence` category
  while expected authorization and not-found outcomes remain quiet.
- Authenticated profile password changes now emit redacted
  `password_updated` / `password_update_failed` events with request
  correlation, user ID, status, duration, stable error category, and provider
  code; password values and provider messages remain excluded.
- Public enrollment persistence now emits redacted `enrollment_created` /
  `enrollment_create_failed` events with request correlation, source, status,
  duration, and the persisted enrollment ID on success; applicant identity,
  contact details, application text, and raw database errors remain excluded.
- Manual Admin enrollment invitation sends now emit redacted
  `enrollment_invitation_sent` / `enrollment_invitation_failed` events with
  request correlation, actor/enrollment/invitation IDs where available,
  new-versus-resend mode, status, duration, and stable delivery or persistence
  categories; recipient email addresses, invitation tokens, and provider
  errors remain excluded.
- Students can now mark published lessons complete from the lesson detail page.
  The existing `lesson_progress` table has a unique `(student_id, lesson_id)`
  constraint, and the completion server function uses an idempotent upsert.
  Operational events are redacted `lesson_completed`,
  `lesson_completion_ignored`, and `lesson_completion_failed` events; lesson
  content remains excluded.
- After a first successful completion, the server function now determines
  whether every published lesson in that course is complete. The response
  exposes a transition-only `courseCompleted` flag, and the browser emits
  PostHog `course_completed` once with only the stable course ID. Repeated
  completion requests do not emit duplicate course-completion analytics.
- Post and comment reaction toggles now emit redacted success events with
  request correlation, actor and target IDs, reaction action, emoji, status,
  and duration. Unexpected persistence failures use stable post/comment
  reaction categories without raw database details.
- Post channel, feed, single-post, and comment read services now require a
  persisted caller profile. The authenticated actor ID is passed from each
  server-function adapter into the service boundary, closing direct service
  calls that could otherwise bypass the profile check without changing the
  response shapes for authenticated roles.
- Post-notification group and mark-all read-state mutations now emit redacted
  `notification_group_marked_read` / `notifications_marked_read` events with
  request correlation, actor/target metadata, read scope, status, and duration.
  Unexpected persistence failures use the stable
  `notification_read_state_persistence` category without notification content
  or raw database details.
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
- Admin invitation creation and resend now emit redacted success and email
  delivery-failure events with request correlation, actor/invitation IDs, role,
  duration, and stable error categories. Revoke and delete operations emit the
  same audit shape, and invitation email addresses, tokens, and provider error
  text remain excluded.
- Course-teacher lesson creation, update, and deletion now emit redacted
  `lesson_created`, `lesson_updated`, and `lesson_deleted` events with request
  correlation, server-function path, actor/course/lesson IDs, status, and
  duration. Persistence failures emit stable `lesson_persistence` categories;
  lesson content, titles, and provider/database messages are excluded.
- Assignment create, update, and delete mutations now emit redacted
  `assignment_created`, `assignment_updated`, and `assignment_deleted` events
  with request correlation, server-function path, actor/course/lesson/
  assignment IDs, status, and duration. Assignment titles, descriptions, due
  dates, and raw persistence details remain excluded; unexpected failures use
  the stable `assignment_persistence` category.
- Calendar event creation, update, and deletion now emit redacted
  `calendar_event_created`, `calendar_event_updated`, and
  `calendar_event_deleted` events with request correlation, actor/event/course
  IDs, category, status, and duration. Event titles, descriptions, locations,
  meeting links, and timestamps remain excluded.
- Course creation, update, and deletion now emit redacted `course_created`,
  `course_updated`, and `course_deleted` events with request correlation,
  server-function path, actor/course IDs, status, duration, and publication
  state where relevant. Unexpected persistence failures emit the stable
  `course_persistence` category; expected authorization, validation, and
  teacher-assignment conflict outcomes remain outside noisy error logs.
- Admins now have an authenticated `/admin/observability` hub that links to
  Better Stack, Cloudflare, Supabase, and Notion operations surfaces. Link URLs
  are public environment configuration only; no provider credentials are sent
  to the browser.
- Media-library create, update, and delete mutations now emit redacted
  `media_created`, `media_updated`, and `media_deleted` events with request
  correlation, actor/media IDs, media kind, course ID, status, and duration.
  Titles, descriptions, URLs, private storage paths, and raw persistence
  details remain excluded; unexpected failures use the stable
  `media_persistence` category.
- Media-library reads, CRUD mutations, and private upload helpers now derive
  the caller role from the persisted profile inside the service. The server
  function adapters pass only the authenticated user ID, preventing direct
  callers from forging a role to bypass unpublished-media or staff/ownership
  checks.
- Course detail reads now derive the viewer's course-management permission from
  persisted role and assigned course teachers before returning content.
  Assigned course teachers and admins retain unpublished lessons and media;
  other teachers receive published content only, preventing draft disclosure
  and signed URLs for unpublished private media.
- Course catalog reads now apply the same draft-content boundary before returning
  dashboard and catalog payloads: assigned course teachers and admins retain
  unpublished lessons, while other teachers receive published lessons only.
- Exam create, save, and publish mutations now emit redacted
  `exam_created`, `exam_updated`, and `exam_published` events with request
  correlation, actor/exam IDs, exam status, question counts, duration, and
  stable persistence failure categories. Exam titles, dates, question
  prompts, option labels, and raw persistence details remain excluded.
- Student exam-taking start/resume and autosaved-answer mutations now emit
  redacted `exam_attempt_started`, `exam_attempt_resumed`, and
  `exam_answer_saved` events with request correlation, student/attempt/exam
  IDs, attempt/question status, question type, and duration. Selected option
  IDs, answer text, and raw persistence details remain excluded; unexpected
  failures use stable `exam_attempt_persistence` or
  `exam_answer_persistence` categories.
- The optional PostHog browser foundation now initializes from the root route
  when `VITE_POSTHOG_KEY` is configured. It identifies users by stable ID and
  role only, allow-lists the initial LMS journey event names, disables
  autocapture and session recording, and resets identity on logout.
- The public enrollment form now emits `enrollment_started` once per form
  visit, before any applicant data is submitted. The event carries only the
  stable `source=public_enrollment_form` discriminator and is suppressed on the
  success-only confirmation view.
- The public enrollment form now emits `enrollment_submitted` after the
  enrollment server mutation succeeds. Its only property is the stable
  `source=public_enrollment_form` discriminator; applicant identity, contact
  details, demographic values, and application text remain outside analytics.
- The student assignment detail route now emits `assignment_submitted` after a
  successful submit mutation. Draft saves do not emit the event, and the only
  property is the stable assignment ID; answer content remains outside
  analytics.
- The course detail route now emits `course_started` when a student opens the
  first unfinished published lesson. The event carries only the stable course
  ID; lesson content and titles remain outside analytics.
- The same first-course-start boundary now emits `student_activated` once per
  authenticated user in a browser profile. It carries only the stable course
  ID and uses a user-keyed browser-local marker to avoid duplicate activation
  events on repeated course opens; cross-device deduplication remains a
  PostHog reporting concern.
- A successful teacher grading mutation now emits
  `teacher_review_completed` with stable assignment and submission IDs only;
  grade and feedback content remain outside analytics.
- A student's first successful completion of the final published lesson now
  emits `course_completed` with only the stable course ID. The server checks
  published lessons and the student's completed progress rows; no course title,
  lesson content, or progress timestamps leave the application.
- Added `docs/observability-runbook.md` with Better Stack, Cloudflare, Supabase,
  and PostHog alert response steps; severity and role-based escalation;
  first-check and mitigation procedures; incident tracking; recovery; and
  closure guidance. It intentionally uses role-based owners until account
  owners and Slack escalation targets are configured externally.
- Added `docs/database-backup-restore-runbook.md` with a monthly isolated-target
  Supabase restore drill, schema/index and application checks, evidence and
  cleanup requirements, logical-backup fallback, and incident-only
  same-project restore guidance. The database restore-confidence SLO remains
  unverified until an external drill produces dated evidence; Storage object
  recovery is a separate concern.
- Added `docs/plan/ERROR_BUDGET_POLICY.md` with activation gates, initial
  availability/error-rate/restore-confidence budgets, breach responses, and
  review rules. The policy is deliberately non-blocking until Better Stack,
  Cloudflare, Uptime, and restore-drill evidence are verified.
- Phase 3 now has a repository-owned safe-delivery procedure covering the
  existing GitHub quality/migration gates, hosted Supabase promotion order,
  expand/contract schema changes, release evidence, and application-versus-
  database rollback decisions. Hosted rehearsal and external branch,
  Cloudflare, Better Stack, and Notion controls remain pending.
- Phase 3 now has an executable `bun run smoke:health -- <deployment-origin>`
  check for post-deploy liveness and database readiness. It validates both
  `/healthz` and `/readyz` without authentication, credentials, or private
  provider URLs; use `SMOKE_BASE_URL` for CI/deployment shells.
- Phase 3 now has `.github/workflows/post-deploy-smoke.yml`, a manual and
  reusable GitHub Actions entry point for the same credential-free check. It
  accepts only a public deployment origin, passes it through `SMOKE_BASE_URL`,
  and can be called by a future Cloudflare deployment workflow.
- Phase 4 now has an initial query/index review for the bounded community feed,
  post comments, and notification inbox. Migration `0047_abnormal_firelord`
  adds additive indexes for their existing filter/order shapes without
  changing application behavior. The review and measurement plan lives in
  `docs/plan/PERFORMANCE_QUERY_INDEX_REVIEW.md`.
- Phase 4 course lesson reads now have the additive
  `lessons_course_order_idx` index on `(course_id, order_index, id)`. It
  supports ordered course detail, authoring, attendance, and completion reads
  without changing query or response behavior. Migration
  `0048_blue_golden_guardian` and the hosted `EXPLAIN (ANALYZE, BUFFERS)`
  follow-up are documented in `docs/plan/PERFORMANCE_QUERY_INDEX_REVIEW.md`.
- The published upcoming-lesson dashboard query now has the additive
  `lessons_published_scheduled_idx` index on `(is_published, scheduled_time)`.
  It supports the existing future-lesson filter, ascending order, and limit
  without changing query or response behavior. Migration
  `0049_legal_absorbing_man` and the hosted `EXPLAIN (ANALYZE, BUFFERS)`
  follow-up are documented in `docs/plan/PERFORMANCE_QUERY_INDEX_REVIEW.md`.
- Course-team reads now have the additive
  `course_teachers_course_created_at_idx` index on `(course_id, created_at)`.
  It supports course membership lookups and oldest-first teacher assignment
  reads without changing query, authorization, or response behavior. The
  migration and hosted `EXPLAIN (ANALYZE, BUFFERS)` follow-up are documented
  in `docs/plan/PERFORMANCE_QUERY_INDEX_REVIEW.md`.
- Student submission reads now have the additive `submissions_student_id_idx`
  index on `student_id`. It supports the existing student-scoped assignment
  and grading reads without changing conflict-safe saves, authorization,
  response shape, or grading behavior. Migration `0052_chief_the_fallen` and
  the hosted `EXPLAIN (ANALYZE, BUFFERS)` follow-up are documented in
  `docs/plan/PERFORMANCE_QUERY_INDEX_REVIEW.md`.
- Teacher lesson assignment reads now have the additive
  `assignments_lesson_due_date_idx` index on `(lesson_id, due_date)`. It
  supports the existing managed-lesson filter and ascending due-date order
  without changing authorization, response shape, or publication behavior.
  Migration `0053_youthful_rafael_vega` and the hosted
  `EXPLAIN (ANALYZE, BUFFERS)` follow-up are documented in
  `docs/plan/PERFORMANCE_QUERY_INDEX_REVIEW.md`.
- Student assignment lists now have the additive
  `assignments_status_due_date_idx` index on `(status, due_date)`. It supports
  the existing published-assignment filter and ascending due-date order
  without changing student authorization, submission joins, or response
  shape. Migration `0057_thin_mandrill` and the hosted
  `EXPLAIN (ANALYZE, BUFFERS)` follow-up are documented in
  `docs/plan/PERFORMANCE_QUERY_INDEX_REVIEW.md`.
- Student open-attendance-session reads now have the additive
  `attendance_sessions_closes_at_opened_at_idx` index on `(closes_at,
opened_at)`. It supports filtering active windows before recent-opening
  ordering without changing authorization, session lifecycle, or response
  shape. Migration `0054_elite_polaris` and the hosted
  `EXPLAIN (ANALYZE, BUFFERS)` follow-up are documented in
  `docs/plan/PERFORMANCE_QUERY_INDEX_REVIEW.md`.
- Teacher exam-grading reads now have the additive
  `exam_attempts_exam_started_at_idx` index on `(exam_id, started_at)`. It
  supports filtering attempts for one exam before earliest-start ordering
  without changing grading authorization, attempt lifecycle, or response
  shape. Migration `0055_motionless_jazinda` and the hosted
  `EXPLAIN (ANALYZE, BUFFERS)` follow-up are documented in
  `docs/plan/PERFORMANCE_QUERY_INDEX_REVIEW.md`.
- Phase 5 now has a repository-owned dependency-security baseline: the weekly,
  pull-request, main-branch, and manual GitHub audit workflow runs
  `bun audit --audit-level=high`, blocks high/critical findings, and uploads its
  JSON report for lower-severity triage. Dependabot checks the Bun-compatible
  manifest and lockfile weekly. The review policy and remaining RBAC, secret,
  audit, and threat-model work are documented in `docs/plan/SECURITY.md`.
- The direct browser-used `pdfjs-dist` high-severity advisory is remediated by
  upgrading from `5.7.284` to `^6.2.108`. The private PDF viewer and local eBook
  importer use only PDF.js parsing/canvas APIs and do not instantiate the
  annotation/viewer scripting layer. The current high/critical baseline is
  clear; lower-severity development-tool findings remain visible in the audit
  report for routine triage.
- The dev-only `@tanstack/devtools-vite` dependency chain no longer resolves the
  vulnerable `shell-quote@1.8.3`: a root `package.json` override pins
  `shell-quote` to `^1.10.0`, covering its command-injection and parser
  denial-of-service advisories without changing application runtime behavior.
- The shadcn Model Context Protocol development-tool chain no longer resolves
  vulnerable `undici@7.28.0`: a lockfile-only refresh resolves its compatible
  nested branch to `undici@7.29.0`, while jsdom keeps its separate undici 8.x
  branch. The local audit baseline was subsequently cleared by removing the
  unused shadcn CLI dependency and pinning compatible picomatch 4.x paths.
- The `vitest` → `vite-node` development chain no longer resolves vulnerable
  `vite@7.3.1`: the current root `package.json` override pins every Vite
  resolution to `^8.3.0`, removing the nested package while keeping the current
  build behavior unchanged.
- Calendar event listing now authenticates and authorizes the caller inside the
  server-side service. Students can no longer bypass the `/events` route guard
  by invoking the `getEvents` server function directly; teachers and admins
  retain the existing event-management view.
- The authenticated calendar overview now authenticates its server-function
  caller and requires a persisted profile before reading published lessons,
  assignments, or special events. All authenticated roles retain the existing
  calendar payload; direct unauthenticated invocation is rejected.
- Post and comment moderation now resolves persisted ownership in the shared
  authorization adapter. Authors retain their own edit/delete access, while
  non-author moderation requires Teacher or Admin access; non-owner students
  are rejected before writes. This aligns the application boundary with the
  existing Supabase staff-update policies.
- The Admin enrollment dialog's active-substitution lookup now authenticates
  through `getCurrentUser()` and delegates to an Admin-only service boundary.
  Direct unauthenticated and student calls can no longer read absent-teacher IDs
  from `course_substitutes`.
- The teacher-directory service now requires a persisted caller profile, and the
  Zoom-link owner-options path passes its authenticated actor through instead of
  invoking the directory without context. Teacher-directory payloads and
  Admin-only privilege metadata are unchanged.
- Student directory list and detail services now require a teacher or Admin
  actor before reading student profiles, submissions, attendance, or related
  course data. The server-function adapters pass the authenticated actor ID
  into the service boundary, and direct student service calls are covered by
  negative integration tests.
- The runtime and CI secret inventory is now documented in
  `docs/plan/SECRET_INVENTORY.md`: server-secret classification, public
  `VITE_*` boundaries, Cloudflare Worker and GitHub environment storage,
  role-based rotation, Better Stack acceptance checks, and redacted evidence
  requirements are explicit. Named account owners, live values, and the first
  controlled rotation remain external setup work.
- The repository-owned Phase 5 threat-model baseline is now documented in
  `docs/plan/THREAT_MODEL.md`. It maps actors, restricted assets, trust
  boundaries, and fourteen threats across authentication, authorization,
  public abuse, secrets, telemetry, storage, CSRF, integrations, dependencies,
  recovery, capacity, RLS, and provider configuration. Each row names the
  current repository control and the remaining external or evidence-gated
  action.
- The ESLint and `ts-morph` development-tool chains no longer resolve
  vulnerable `brace-expansion@1.1.12`: a targeted `bun update
brace-expansion` refreshes their compatible 1.x lockfile branches to
  `1.1.18`, while preserving the separate `brace-expansion@5.0.9` and
  `brace-expansion@2.1.4` trees used by newer `minimatch` releases.
- All audited paths now resolve Browserslist through a root `package.json`
  override to patched `browserslist@4.28.9`, covering the two high-severity
  Browserslist advisories without promoting a separate direct dependency or
  changing application runtime behavior.
- The ESLint development-tool chain no longer resolves vulnerable
  `flatted@3.4.1`: a root `package.json` override floors compatible `flatted`
  paths at `^3.4.2`, and the lockfile resolves `flatted@3.4.4`. This removes
  the prototype-pollution advisory without changing application runtime
  behavior.

## Iteration 114 — calendar overview telemetry

This iteration completed the next repository-owned structured-logging slice:

- The authenticated calendar overview service now emits a redacted
  `calendar_events_loaded` event with request correlation, actor ID, safe lesson,
  assignment, special-event, and total counts, status, and duration.
- Unexpected calendar read failures emit `calendar_events_load_failed` with the
  stable `calendar_read_persistence` category. Calendar titles, descriptions,
  locations, meeting links, and timestamps remain outside telemetry.
- Added integration coverage for the event contract and redaction. Focused and
  full integration tests passed (411 tests), as did `bun run quality:gate` with
  1,953 unit tests, formatting, typecheck, `git diff --check`, and
  `bun run build`. Existing TanStack `inputValidator` deprecation and large
  chunk warnings remain unrelated.
- Notion Architecture Inventory, Observability, SLI/SLO, Operational
  Dashboards, and Engineering Roadmap records were synchronized. Better Stack
  ingestion, Cloudflare destinations, dashboards, alerts, source maps, and
  hosted evidence remain external setup work.

## Iteration 111 — student assignment list index

This iteration completed the next repository-owned Phase 4 performance slice:

- Added `assignments_status_due_date_idx` on `(status, due_date)` for the
  existing student assignment list, which filters to published assignments
  and orders them by due date.
- Kept student-role authorization, submission joins, response shape, and
  assignment publication behavior unchanged. The index is additive and does
  not replace the lesson-scoped catalog indexes.
- Migration replay, the repository quality gate, and the production build are
  the verification contract. Hosted `EXPLAIN (ANALYZE, BUFFERS)` plan and
  timing evidence remains pending until representative hosted data exists.
- Validation passed: 408 integration tests, 1,953 unit tests through
  `bun run quality:gate`, formatting, typecheck, `git diff --check`, and
  `bun run build`. Existing TanStack `inputValidator` deprecation and large
  chunk warnings remain unrelated.
- Notion Data Management, Architecture Inventory, and Engineering Roadmap
  records were synchronized. Production Readiness was skipped because only
  the protected template row exists and this index does not change launch
  ownership, SLOs, or a production decision.

## Iteration 112 — course-catalog authorization hardening

This iteration closed the remaining parallel course-content read path:

- `getCoursesService` previously returned unpublished lessons to every teacher
  because the course-list query used the broad teacher role as its only switch.
- The service now keeps draft lessons only for the Admin or the teacher assigned
  to that course; other teachers receive the same published-only lesson view
  used by course-detail reads.
- Added integration coverage for an assigned teacher retaining drafts and an
  outsider teacher receiving only published lessons. Course metadata, admin
  access, student progress behavior, and response shapes remain unchanged.
- Updated `src/utils/README.md`, `docs/plan/SECURITY.md`, and
  `docs/plan/THREAT_MODEL.md`. Better Stack/Cloudflare acceptance, hosted RLS,
  restore/rollback rehearsal, and public-abuse controls remain external
  follow-up work.

Validation: focused course integration tests passed (52 tests), the full
integration suite passed (409 tests), the quality gate passed (1,953 unit
tests), and formatting, typecheck, and the production build passed.

## Iteration 85 — flatted transitive dependency remediation

This iteration completed the next bounded Phase 5 dependency remediation:

- Added the root Bun/npm override `flatted: ^3.4.2` for the ESLint
  development-tool chain, which previously resolved `flatted@3.4.1` through
  `flat-cache`.
- The lockfile now resolves `flatted@3.4.4`, covering the high-severity
  prototype-pollution advisory [GHSA-rf6f-7fwh-wjgh](https://github.com/advisories/GHSA-rf6f-7fwh-wjgh).
  The affected package remains a development-only ESLint dependency and is
  not bundled into the deployed Worker or browser runtime.
- The high-severity Bun audit baseline decreased from 13 to 12 findings. The
  residual findings remain report-only while the next transitive package is
  reviewed separately.

Validation for this iteration: `bun install --lockfile-only`, targeted lockfile
and dependency-resolution checks, post-change `bun audit --audit-level=high`
(expected exit 1 with 12 residual high findings), and the repository quality,
integration, and production-build gates.

## Iteration 83 — PostCSS and Nanoid transitive dependency remediation

This iteration completed the next bounded Phase 5 dependency remediation:

- Added a top-level Bun/npm `overrides` entry that resolves all compatible
  `postcss` dependency paths to `^8.5.28`. The vulnerable paths were the Vite
  and shadcn build-tool chains, which previously retained `postcss@8.5.8`.
- The patched PostCSS release covers the arbitrary file-read and source-map
  path-traversal advisories [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q)
  and [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849).
  Its compatible `nanoid` refresh to `3.3.19` also removes the three Nanoid
  advisories from the same audit tree.
- The lockfile now resolves `postcss@8.5.28` and `nanoid@3.3.19`. Both remain
  development/build dependencies and are not bundled into the deployed Worker
  runtime. The high-severity audit baseline decreased from 25 to 20 findings;
  residual findings remain report-only pending separate reachability or upgrade
  decisions.

Validation for this iteration: `bun install`, post-change
`bun audit --audit-level=high`, targeted lockfile resolution checks, and the
repository quality/integration/build gates. The audit remains report-only while
the remaining transitive packages are triaged.

## Iteration 84 — fast-uri transitive dependency remediation

This iteration completed the next bounded Phase 5 dependency remediation:

- Added the root Bun/npm override `fast-uri: ^3.1.6` for the shadcn Model
  Context Protocol toolchain, which previously resolved `fast-uri@3.1.0`
  through `ajv` and `ajv-formats`.
- The lockfile now resolves `fast-uri@3.1.7`, covering seven high-severity
  URL normalization, SSRF, host-confusion, and path-traversal advisories in
  the vulnerable `3.0.x` range. The affected package remains a development-only
  JSON-schema/tooling dependency and is not bundled into the deployed Worker or
  browser runtime.
- The high-severity Bun audit baseline decreased from 20 to 13 findings. The
  residual findings remain report-only while the next transitive package is
  reviewed separately.

Validation for this iteration: `bun install`, targeted lockfile and dependency
resolution checks, post-change `bun audit --audit-level=high` (expected exit 1
with 13 residual high findings), the repository quality/integration/build gates,
and documentation/Notion synchronization.

## Iteration 82 — Browserslist transitive dependency remediation

This iteration completed the next bounded Phase 5 dependency remediation:

- Added the root Bun override `browserslist: ^4.28.9`, which applies to the
  shadcn, TanStack, Vite, and Sentry build-tool dependency paths that previously
  shared vulnerable `browserslist@4.28.1`.
- Covered the two high-severity Browserslist advisories for unbounded cache
  growth and untrusted `browserslist-stats.json` normalization:
  [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) and
  [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g).
- The high-severity Bun audit baseline dropped from 27 to 25 findings. The
  remaining findings are transitive development-tool dependencies and remain
  report-only while each is triaged separately.

Validation for this iteration: `bun install`, lockfile inspection, targeted
dependency-tree inspection, `bun audit --audit-level=high` (expected exit 1
with 25 residual high transitive findings), and the repository quality gate.

## Iteration 80 — brace-expansion transitive dependency remediation

This iteration completed the next bounded Phase 5 dependency remediation:

- Refreshed the compatible `brace-expansion` lockfile branches with
  `bun update brace-expansion`. Bun now resolves the vulnerable ESLint/`ts-morph`
  `1.1.12` branch to `1.1.18` while retaining `2.1.4` and `5.0.9` for the
  newer `minimatch` consumers.
- Covered the three high-severity brace-expansion denial-of-service advisories
  reported by the local audit: unbounded expansion length, unbounded
  intermediate arrays, and exponential expansion of consecutive non-expanding
  groups.
- The high-severity Bun audit baseline dropped from 36 to 27 findings. The
  remaining findings are transitive development-tool dependencies and remain
  report-only while each is triaged separately.

Validation for this iteration: `bun update brace-expansion`, `bun install`,
targeted dependency-tree inspection, `bun audit --audit-level=high` (expected
exit 1 with 27 residual high transitive findings), and the repository quality
gate.

## Iteration 79 — Phase 5 threat-model baseline

This iteration completed the next repository-owned Phase 5 security slice:

- Added `docs/plan/THREAT_MODEL.md` with the DINA actors, sensitive assets,
  seven trust boundaries, fourteen threat-register entries, current control
  evidence, review contract, and prioritized follow-up actions.
- Explicitly documented the security boundary between server-side application
  authorization and the current direct Postgres/RLS state; no RLS policy or
  production rate-limit behavior was changed without request-identity evidence.
- Linked the threat model from `docs/plan/SECURITY.md` and kept hosted Better
  Stack, Cloudflare, PostHog, restore, rollback, and secret-rotation work as
  external verification rather than inventing account-specific values.

Validation for this iteration: Markdown formatting, docs:notion-check, and the
quality gate passed. Notion Security, Engineering Maturity, Maturity Tracking,
and Engineering Roadmap records were synchronized; Production Readiness was
skipped because this is a security baseline, not a launch decision.

## Iteration 78 — runtime and CI secret inventory

This iteration completed the repository-owned portion of the remaining Phase 5
secret-management work:

- Added `docs/plan/SECRET_INVENTORY.md` with the complete server, browser,
  local, build, and CI variable classification.
- Mapped restricted values to Cloudflare Worker secrets, GitHub `development`
  and `production` environments, or ignored local `.env` storage; public
  configuration remains explicitly separated from credentials.
- Added role-based rotation, Better Stack DSN acceptance, Cloudflare dashboard
  navigation, rollback, and redacted evidence procedures without recording any
  credential values.
- Linked the contract from `docs/plan/SECURITY.md`; the remaining work is
  account-level owner assignment, live-value verification, and one controlled
  rotation.

Validation for this iteration: the documentation diff was checked for
formatting and secret-value absence; `bun run docs:notion-check` and
`bun run quality:gate` passed with 1,953 unit tests. Notion Security, Maturity
Tracking, and Engineering Roadmap records were synchronized. Production
Readiness Reviews were skipped because no launch decision changed.

## Iteration 77 — teacher directory service authorization hardening

This iteration closed the next concrete Phase 5 service boundary gap:

- Changed `getTeachersService` to require an actor ID and validate its persisted
  profile before reading teacher records.
- Threaded the already-authenticated actor through `getZoomLinksService` when it
  builds non-student teacher owner options.
- Added integration coverage proving a missing profile cannot call the direct
  teacher-directory service, while existing teacher/admin listing behavior and
  Admin-only staff privilege metadata remain intact.

Validation for this iteration: the focused teacher and Zoom-link integration
suites, full integration tests, `bun run quality:gate`, typecheck, formatting,
production build, and `git diff --check` passed. The existing Notion Architecture
Inventory row and Engineering Roadmap were synchronized. Service Catalog was
skipped because ownership, criticality, runtime boundary, and SLOs did not
change; Production Readiness Reviews was skipped because this was not a new
launch review.

## Iteration 76 — active substitution lookup authorization hardening

This iteration closed the next concrete Phase 5 server-function boundary gap:

- Added `getActiveSubstitutedTeacherIdsService(userId)`, which requires the
  Admin role before reading active substitution IDs.
- Updated the `getActiveSubstitutedTeacherIds` server-function adapter to
  authenticate the caller and use the guarded service instead of querying the
  repository directly.
- Added integration coverage proving Admin access remains available while a
  student receives the existing typed `AuthorizationError`.

Validation for this iteration: focused enrollment integration (44 tests), full
integration (378 tests), `bun run quality:gate` (1,953 unit tests), typecheck,
formatting, production build, and `git diff --check` passed. Notion Architecture
Inventory, Security, Risk Register, and Engineering Roadmap records were
synchronized. Service Catalog and Production Readiness were skipped because
ownership and launch decisions did not change.

## Iteration 75 — post/comment moderation authorization hardening

This iteration closed the next concrete Phase 5 RBAC gap from the application
security review:

- Replaced the permissive `canAccessPost` and `canAccessComment` placeholders
  with ownership-aware checks for edit/delete actions.
- Preserved author self-service and staff moderation, while rejecting
  non-author students with the existing typed authorization error before any
  mutation executes.
- Added integration coverage for student denial and Teacher moderation of
  posts and comments. Existing content shapes, soft-delete behavior, and
  telemetry remain unchanged.

Validation for this iteration: focused post integration tests, full integration
tests, `bun run quality:gate`, typecheck, formatting, production build, and
`git diff --check` passed. The Notion Architecture Inventory, Security, and
Engineering Roadmap records were synchronized.

## Iteration 74 — authenticated calendar overview hardening

This iteration closed the next concrete Phase 5 server-function boundary gap:

- Updated `getCalendarEvents` to call `getCurrentUser()` before delegating to
  the calendar service.
- Updated `getCalendarEventsService(userId)` to require an existing profile
  before any calendar query executes, keeping the lower-level service safe for
  direct callers as well as the route loader.
- Added integration coverage for the profile prerequisite while preserving the
  existing published lesson/assignment filtering, special-event mapping, sort
  order, and response shape.

Validation for this iteration: focused calendar integration tests, full
integration tests, `bun run quality:gate`, typecheck, formatting, production
build, and `git diff --check` passed. The Notion Architecture Inventory and
Engineering Roadmap records were synchronized.

## Iteration 73 — calendar event listing authorization hardening

This iteration closed one concrete RBAC gap from the Phase 5 application
security review:

- Moved the calendar event listing query into `getEventsService(actorId)` and
  required a resolved `teacher` or `admin` role before any event data is read.
- Updated the `getEvents` server-function adapter to authenticate with
  `getCurrentUser()` and pass the stable user ID into the guarded service.
- Added integration coverage proving students are denied while teachers and
  admins retain access to the existing event payload.
- Preserved the existing course-name join, ordering, response shape, and
  create/update/delete behavior. The browser route guard remains as a UX
  boundary, while the service check is the API boundary.

Validation for this iteration: focused calendar integration (3 tests), full
quality gate (1,953 unit tests), full integration (371 tests), typecheck,
formatting, production build, and `git diff --check` passed. The Notion
Architecture Inventory and Engineering Roadmap records were synchronized.

## Iteration 72 — nested Vite dependency remediation

This iteration completed the next bounded Phase 5 dependency remediation:

- Added a top-level Bun/npm `overrides` entry that resolves all Vite dependency
  paths to `^7.3.6`. Before the change, the direct dependency was already
  `vite@7.3.6`, but `vite-node@3.2.4` retained a nested `vite@7.3.1`.
- The nested package triggered the high-severity Vite advisories for query-based
  `server.fs.deny` bypasses, Vite dev-server WebSocket arbitrary file reads, and
  Windows alternate path handling. The selected `7.3.6` release is beyond the
  patched `7.3.2` / `7.3.5` thresholds documented by the Vite advisories.
- Bun installation removed the nested `vite-node/vite` lockfile entry and the
  corresponding duplicate esbuild tree. The post-change high-severity audit
  dropped from 39 to 36 findings; the remaining findings are transitive
  development-tool packages and stay report-only while triage continues.

Validation for this iteration: `bun install`, targeted package-resolution checks,
`bun audit --audit-level=high` (expected exit 1 with 36 residual high transitive
findings), frozen install, `bun run quality:gate` (1,953 unit tests),
`bun run test:integration` (370 tests), `bun run build`, scoped Prettier, and
`git diff --check` all passed. The audit remains report-only while residual
transitive packages are triaged.

## Iteration 71 — shell-quote transitive dependency remediation

This iteration completed the next bounded Phase 5 dependency remediation:

- Added a top-level Bun/npm `overrides` entry that resolves the transitive
  `shell-quote` dependency to `^1.10.0`. The vulnerable path is
  `@tanstack/devtools-vite` → `launch-editor` → `shell-quote@1.8.3`.
- The override covers the command-injection advisory
  [GHSA-w7jw-789q-3m8p](https://github.com/advisories/GHSA-w7jw-789q-3m8p), patched
  in `1.8.4`, and the parser denial-of-service advisory
  [GHSA-395f-4hp3-45gv](https://github.com/advisories/GHSA-395f-4hp3-45gv), patched
  in `1.9.0`. The lockfile now resolves `shell-quote@1.10.0`.
- Updated `docs/plan/SECURITY.md` with the reachability, override policy, and
  re-audit requirement. The remaining audit findings are still transitive and
  remain report-only pending separate reachability or upgrade slices.

Validation for this iteration: `bun install`, the post-change
`bun audit --audit-level=high --json`, targeted package resolution, and the
repository quality gate. The audit no longer reports `shell-quote`; it still
reports other high-severity transitive findings for follow-up.

## Iteration 70 — direct PDF dependency remediation

This iteration completed the first remediation slice from the Phase 5 audit:

- Upgraded `pdfjs-dist` from `5.7.284` to `^6.2.108` (resolved locally to
  `6.3.289`), which contains the upstream fix for
  [GHSA-hq66-cqwq-w95j](https://github.com/mozilla/pdf.js/security/advisories/GHSA-hq66-cqwq-w95j).
- Confirmed both PDF.js consumers stay on parsing/canvas APIs and do not create
  an annotation/viewer scripting layer; future annotation integration must set
  `enableScripting: false` explicitly.
- Kept the audit workflow report-only because the remaining high/critical
  findings are transitive and require separate reachability or upgrade slices.

Validation for this iteration: targeted formatting, TypeScript, the full unit
suite, production build, and a post-change high-severity Bun audit. The audit
still reports transitive findings for follow-up; the direct `pdfjs-dist` finding
is no longer present.

## Iteration 69 — dependency-security baseline

This iteration completed the first repository-owned Phase 5 security slice:

- Added `.github/workflows/dependency-security.yml` for pull-request,
  main-branch, weekly, and manual `bun audit --audit-level=high` reporting.
- The workflow uploads a 14-day JSON audit artifact and warns without blocking
  while the known high/critical baseline is triaged; it does not suppress or
  hide advisory output.
- Added weekly Dependabot checks for the Bun-compatible npm manifest and
  lockfile, with `dependencies` and `security` labels.
- Added `docs/plan/SECURITY.md` with vulnerability reachability order,
  remediation expectations, and remaining RBAC/RLS, admin-hardening, secret
  inventory, audit-verification, and threat-model work.

Validation for this iteration: local high-severity Bun audit, Prettier, YAML
inspection, `git diff --check`, and the repository quality gate. The audit
currently reports known high/critical findings; remediation is intentionally a
separate bounded dependency-update slice.

## Iteration 68 — exam grading attempt index

This iteration completed the next repository-owned Phase 4 slice:

- Added `exam_attempts_exam_started_at_idx` on `(exam_id, started_at)` for the
  existing teacher grading query, which filters attempts to one exam and orders
  them by earliest start time.
- Kept grading authorization, attempt state transitions, response shape, and
  student attempt history unchanged. The index is additive and complements
  the existing `(exam_id, status)` and `(exam_id, student_id)` indexes.
- Extended the performance review and database README. Hosted verification now
  covers eleven indexed query shapes; the student-wide attempt history query
  remains evidence-gated until representative hosted data exists.

Validation for this iteration: migration generation and replay, focused exam
integration coverage, formatting, `git diff --check`, `bun run docs:notion-check`,
`bun run quality:gate`, and `bun run build`. Hosted plan/timing evidence
remains pending representative development data.

## Iteration 67 — open attendance session index

This iteration completed the next repository-owned Phase 4 slice:

- Added `attendance_sessions_closes_at_opened_at_idx` on `(closes_at,
opened_at)` for the existing student open-session query, which filters out
  closed windows and orders active sessions by most recent opening.
- Kept attendance authorization, session lifecycle, check-in idempotency, and
  response shape unchanged. The index is additive and complements the existing
  course-scoped `(course_id, closes_at)` index used by open/close mutations.
- Extended the performance review and database README. Hosted verification now
  covers ten indexed query shapes; the unbounded student assignment due-date
  index remains evidence-gated until representative hosted data exists.

Validation for this iteration: migration generation and replay, focused
attendance integration coverage, formatting, `git diff --check`,
`bun run docs:notion-check`, and `bun run quality:gate`. Hosted plan/timing
evidence remains pending representative development data.

## Iteration 66 — teacher lesson assignment due-date index

This iteration completed the next repository-owned Phase 4 slice:

- Added `assignments_lesson_due_date_idx` on `(lesson_id, due_date)` for the
  existing teacher lesson assignment read that scopes assignments to managed
  lessons and orders them by due date.
- Kept authorization, response shape, publication behavior, and the separate
  assignment-catalog status query unchanged. The index is additive and
  complements `assignments_lesson_status_idx`.
- Extended the performance review and database README. Hosted verification
  now covers nine indexed query shapes; the unbounded student assignment
  due-date index remains evidence-gated until representative hosted data
  exists.

Validation for this iteration: migration generation and replay, focused
assignment/course integration coverage, formatting, `git diff --check`,
`bun run docs:notion-check`, and `bun run quality:gate`. Hosted plan/timing
evidence remains pending representative development data.

## Iteration 65 — student submission lookup index

This iteration completed the next repository-owned Phase 4 slice:

- Added `submissions_student_id_idx` on `student_id` for the existing
  student-scoped submission reads used by the assignment dashboard and
  teacher/student submission views.
- Kept conflict-safe assignment saves, authorization, response shape, and
  grading behavior unchanged. The index is additive and complements the
  existing `(assignment_id, student_id)` uniqueness index rather than
  replacing it.
- Extended the performance review and database README. Hosted verification
  now covers eight `EXPLAIN (ANALYZE, BUFFERS)` shapes; the due-date index for
  the unbounded student assignment list remains evidence-gated.

Validation for this iteration: migration generation and replay, focused
assignment/student integration coverage, formatting, `git diff --check`,
`bun run docs:notion-check`, and `bun run quality:gate`. Hosted plan/timing
evidence remains pending representative development data.

## Iteration 64 — course-team query index

This iteration completed the next repository-owned Phase 4 slice:

- Added `course_teachers_course_created_at_idx` on `(course_id, created_at)`
  for course-team membership reads and the existing oldest-first teacher
  assignment query.
- Kept query behavior, authorization, response shape, and assignment
  replacement semantics unchanged. The index is additive and compatible with
  the safe-delivery expand/contract procedure.
- Extended the performance review and database README. Hosted verification
  now covers seven `EXPLAIN (ANALYZE, BUFFERS)` shapes; the due-date index for
  the unbounded student assignment list remains evidence-gated.

Validation for this iteration: migration generation and replay, focused course
integration coverage, formatting, `git diff --check`,
`bun run docs:notion-check`, and `bun run quality:gate`. Hosted plan/timing
evidence remains pending representative development data.

## Iteration 63 — assignment catalog query index

This iteration completed the next repository-owned Phase 4 slice:

- Added `assignments_lesson_status_idx` on `(lesson_id, status)` for teacher
  assignment catalog reads that scope assignments to managed lessons and
  published/draft status.
- Kept assignment query behavior, response shape, authorization, ordering, and
  publication semantics unchanged. The index is additive and compatible with
  the safe-delivery expand/contract procedure.
- Extended the performance review and database README. Hosted verification now
  covers six `EXPLAIN (ANALYZE, BUFFERS)` shapes; a due-date index for the
  unbounded student assignment list remains evidence-gated.
- Added migration `drizzle/0050_calm_william_stryker.sql`.

Validation for this iteration: migration generation and replay, focused
assignment/course integration coverage, formatting, `git diff --check`,
`bun run docs:notion-check`, and `bun run quality:gate`. Hosted plan/timing
evidence remains pending representative development data.

## Iteration 62 — published upcoming-lesson query index

This iteration completed the next repository-owned Phase 4 slice:

- Added `lessons_published_scheduled_idx` for the existing dashboard query
  that filters published lessons after the current time, orders by
  `scheduled_time`, and limits the result to five rows.
- Added migration `drizzle/0049_legal_absorbing_man.sql` and updated the
  database README plus the performance review plan.
- Kept the query, response shape, publication semantics, authorization, and
  retention behavior unchanged. The index is additive and compatible with the
  safe-delivery expand/contract procedure.

Validation for this iteration: migration generation and replay, focused course
integration coverage, formatting, `git diff --check`,
`bun run docs:notion-check`, and `bun run quality:gate`. Hosted plan/timing
evidence remains pending representative development data.

## Iteration 61 — ordered course lesson query index

This iteration completed the next repository-owned Phase 4 slice:

- Added `lessons_course_order_idx` for the existing course-scoped lesson
  reads that filter by `course_id` and order by `order_index`.
- Added migration `drizzle/0048_blue_golden_guardian.sql` and updated the
  database README plus the performance review plan.
- Kept publication filtering, pagination, response shape, authorization, and
  retention behavior unchanged. The index is additive and compatible with the
  safe-delivery expand/contract procedure.

Validation for this iteration: migration generation and replay, focused course
integration coverage, formatting, `git diff --check`,
`bun run docs:notion-check`, and `bun run quality:gate`. Hosted plan/timing
evidence remains pending representative development data.

## Iteration 60 — community and notification query indexes

This iteration completed the next repository-owned Phase 4 slice:

- Added `posts_course_created_at_idx` for course/global feed filtering and
  cursor ordering.
- Added `post_comments_post_created_at_idx` for bounded comment pagination.
- Added `post_notifications_user_read_created_at_idx` for per-user inbox and
  unread read-state queries.
- Added migration `drizzle/0047_abnormal_firelord.sql` and documented the
  measured hosted `EXPLAIN` follow-up in
  `docs/plan/PERFORMANCE_QUERY_INDEX_REVIEW.md`.

This is an additive schema change: no query, response, authorization, or
retention behavior changed. Hosted plan/timing evidence remains pending until
the controlled development database contains representative data.

Validation for this iteration: migration replay, focused community and
notification integration tests, formatting, `git diff --check`,
`bun run docs:notion-check`, and `bun run quality:gate`.

## Iteration 59 — GitHub post-deploy health smoke workflow

This iteration completed the next repository-owned Phase 3 slice:

- Added `.github/workflows/post-deploy-smoke.yml` with both `workflow_dispatch`
  for an operator-run check and `workflow_call` for a deployment workflow to
  invoke after Cloudflare reports readiness.
- The workflow installs the pinned Bun toolchain and runs the existing
  `bun run smoke:health` command through `SMOKE_BASE_URL`. It keeps the origin
  out of the shell command and grants only read access to repository contents;
  no deployment, provider, or database credentials are needed.
- Updated `docs/plan/SAFE_DELIVERY.md` with the manual Actions path, reusable
  workflow contract, and promotion checklist wording. Cloudflare deployment
  wiring, branch protection, and hosted rollback rehearsal remain external
  controls.

Validation for this iteration: targeted Markdown/YAML formatting, `git diff
--check`, `bun run docs:notion-check`, and `bun run quality:gate`.

## Iteration 58 — executable health/readiness smoke check

This iteration completed the next repository-owned Phase 3 slice:

- Added `scripts/health-smoke.ts` and a `bun run smoke:health` command that
  checks `/healthz` and `/readyz` concurrently after deployment.
- The check requires HTTP 200, the `christ-dina` service identity, a non-empty
  request ID, and an `ok` database readiness result. It uses a bounded timeout,
  rejects credential/query/hash-bearing URLs, and never prints the deployment
  origin or response body.
- Documented positional and `SMOKE_BASE_URL` usage in the safe-delivery plan,
  observability runbook, and testing guide. Authenticated Playwright journey
  checks remain separate and manual.

Validation for this iteration: focused health-smoke domain tests, formatting,
`bun run quality:gate`, `git diff --check`, and `bun run docs:notion-check`.

## Iteration 57 — safe delivery migration and rollback procedure

This iteration completed the next repository-owned Phase 3 slice:

- Added `docs/plan/SAFE_DELIVERY.md` as the canonical release procedure for
  application-only and migration releases.
- Defined expand/contract rules, the exact `main` → hosted development →
  protected production promotion sequence, post-deploy evidence, and a
  rollback decision tree that does not confuse application rollback with
  database rollback.
- Corrected `drizzle/README.md` so `bun db:push` is explicitly prohibited for
  hosted branches and linked the controlled restore procedure for destructive
  failures.
- Linked the new procedure from `docs/SUPABASE_ENVIRONMENTS.md`; external
  branch protection, Cloudflare deployment checks, Better Stack release
  verification, and rollback rehearsal remain manual follow-up.

Validation for this documentation slice: Prettier, `git diff --check`, and
`bun run docs:notion-check` passed. The hosted migration/rollback rehearsal is
not executable from this unauthenticated local environment.

## Iteration 56 — student activation product analytics

This iteration completed the next repository-owned PostHog journey slice:

- Added `trackStudentActivated(userId, courseId)` to the typed analytics
  boundary. It emits the allow-listed `student_activated` event with only the
  stable course ID and marks the user as activated only after PostHog capture
  is enabled.
- The authenticated course route calls it alongside the existing
  `course_started` event when a student opens the first unfinished published
  lesson. A browser-local key scoped to the stable user ID suppresses repeats
  across course opens without adding a database column or sending applicant,
  lesson, or course content.
- Added analytics coverage for first activation, duplicate suppression for the
  same user, and independent activation for another user.

Validation: focused analytics tests, TypeScript, formatting, and the quality
gate passed. PostHog project/dashboard verification remains external
follow-up.

## Iteration 55 — canonical Better Stack DSN configuration

This iteration completed the next repository-owned cutover slice:

- Added `resolveObservabilityDsn`, a tested resolver that prefers the canonical
  Better Stack DSN and falls back to the legacy Sentry-compatible DSN only when
  the former is unset. Blank values are treated as unconfigured.
- Browser initialization now reads `VITE_BETTER_STACK_DSN`; Worker
  initialization reads `BETTER_STACK_DSN`. The old names remain available only
  as a reversible rollback path.
- Removed the previously committed Sentry DSN from `wrangler.jsonc`. Set the
  Worker secret with `wrangler secret put BETTER_STACK_DSN`; set the browser
  build variable in the deployment environment.
- Updated the environment example and Better Stack error-tracking plan with
  the canonical variables and safe setup instructions.

Validation: focused DSN tests passed (3 tests), TypeScript passed, Wrangler
runtime types regenerated without the committed DSN, and formatting passed.
The external Better Stack source, ingestion, release/source-map, dashboard,
alert, Uptime, Slack, and named-owner checks remain account-specific follow-up.

## Iteration 54 — Better Stack error/trace correlation

This iteration completed the next repository-owned Better Stack transition
slice:

- Added `@opentelemetry/api` as a direct runtime dependency and introduced
  `addActiveTraceContext` under `src/utils/observability/`.
- Browser and Cloudflare Worker Sentry-compatible `beforeSend` hooks now copy
  valid active OpenTelemetry `trace_id` and `span_id` values into the event
  context while preserving existing trace fields and expected-error
  suppression.
- Added focused tests for missing spans, invalid spans, identifier injection,
  and context preservation. This is compatible with Better Stack’s documented
  Sentry SDK correlation path and does not add secrets or custom request-path
  telemetry.

Validation: focused trace-context tests passed, TypeScript passed, and
`bun run quality:gate` passed with 1,936 unit tests. Existing lint/Fallow
warnings remain unrelated. Better Stack application DSN, Cloudflare OTLP
destinations, dashboards, alerts, Uptime monitors, source maps, Slack routing,
and named ownership remain account-specific setup work.

## Iteration 53 — Phase 2 error-budget policy

This iteration completed the next repository-owned reliability slice:

- Documented the initial policy for the existing 28-day availability and
  application-error SLOs plus the 30-day database restore-confidence cadence.
- Defined the activation gate so `Needs data` SLOs are measured but do not
  block releases before provider ingestion, Uptime, ownership, and restore
  evidence are real.
- Defined 50%, 75%, and 100% budget-consumption responses, including the
  exception for security, data-protection, incident-mitigation, and recovery
  work.
- Linked the policy from the production-fundamentals plan; external dashboard,
  alert, ownership, and restore-drill setup remains documented follow-up.

## Iteration 52 — enrollment started product analytics

This iteration completed the remaining repository-owned entry event for the
initial enrollment funnel:

- Added a typed `trackEnrollmentStarted` PostHog helper that sends only the
  stable public-form source discriminator.
- The enrollment form captures one start event per mounted form visit and does
  not capture the success-only confirmation view.
- PostHog remains optional; no event leaves the browser until
  `VITE_POSTHOG_KEY` is configured. The form is currently intentionally gated
  while the 2026 enrollment window is closed, so hosted verification remains an
  external follow-up when the route is reopened.

Validation: focused analytics tests, `bun run quality:gate` (1,933 unit tests),
typecheck, and the production build pass. Existing TanStack
`inputValidator()` deprecation and large-chunk warnings remain; no new warning
was introduced by this slice.

## Iteration 51 — database backup and restore validation runbook

This iteration completed the next repository-owned Phase 2 reliability slice:

- Documented a safe monthly restore drill that uses a disposable, restricted
  Supabase target and never restores production data into the shared development
  branch.
- Added read-only checks for core tables and the unique indexes protecting
  submission and lesson-completion idempotency.
- Added target-only `/healthz`, `/readyz`, authenticated read, and synthetic
  write/read-back smoke checks, plus evidence and cleanup requirements.
- Documented Supabase Dashboard, PITR, and CLI logical-backup paths without
  putting credentials, dumps, or production data in the repository.
- Linked the runbook from `docs/SUPABASE_ENVIRONMENTS.md` and recorded that
  database backups do not restore Storage object bytes.

Validation: Markdown formatting, `git diff --check`, and
`bun run docs:notion-check` pass. The hosted restore drill remains an external
follow-up and the database restore-confidence SLO stays `Needs data` until its
evidence exists.

## Iteration 30 — calendar event structured telemetry

This iteration completed the next independently verifiable structured-logging
slice:

- Moved calendar event create/update/delete persistence behind
  `src/utils/event/service/event.service.ts`.
- Added authenticated actor correlation and stable
  `calendar_event_created`, `calendar_event_updated`, and
  `calendar_event_deleted` events plus stable persistence-failure categories.
- Kept event titles, descriptions, locations, meeting URLs, and timestamps out
  of telemetry; missing update targets remain quiet and preserve existing
  behavior.
- Added integration coverage for success events, safe fields, duration/request
  shape, privacy exclusions, and missing-update behavior.
- Updated `docs/plan/STRUCTURED_LOGGING.md`,
  `docs/plan/OBSERVABILITY.md`, and `src/utils/README.md`.

Validation: focused domain tests (4), focused integration tests (2), full
integration (329 tests), TypeScript typecheck, `bun run quality:gate`, and
production build passed. The next local structured-logging slice can target
the post/comment mutation family; Better Stack destinations, dashboards,
alerts, Uptime monitors, Slack routing, source maps, and named ownership still
require external account configuration described below.

## Iteration 26 — teacher review product analytics

This iteration completed the next independently verifiable PostHog journey
slice:

- Added `trackTeacherReviewCompleted` to the typed browser analytics boundary.
- Emit `teacher_review_completed` only after `gradeSubmission` succeeds.
- Send only `assignmentId` and `submissionId`; grade, feedback, student email,
  and other submission content are not sent.
- Updated the PostHog and observability plans with the new event and remaining
  gaps.

Validation for this iteration: the focused analytics suite, quality gate, and
production build should pass. The remaining product-analytics gap is external
PostHog project/dashboard verification; lesson and course completion boundaries
are now implemented.

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
submission, WhatsApp campaign, post/comment notification delivery, student
attendance check-in, and course-teacher lesson authoring are consumers; broader
server-function migration remains intentionally incremental.

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

## Iteration 18 — invitation lifecycle telemetry

This iteration completed the next high-value server-function slice:

- Admin invitation creation now emits `invitation_created` after the database
  row and email delivery succeed. Persistence and delivery failures emit
  `invitation_create_failed` with stable categories, while the existing row
  rollback remains unchanged.
- Invitation resend now emits `invitation_resent` or
  `invitation_resend_failed`; token rotation and rollback behavior remain
  unchanged.
- Invitation revoke and delete operations now emit success audit events and
  stable persistence-failure events.
- Every event carries `requestId`, the server-function path, outcome status,
  duration, actor/invitation identifiers, and role when available. Email
  addresses, invitation tokens, and raw provider error text are excluded.
- Integration coverage verifies success and delivery-failure event shapes,
  request-safe fields, and redaction for create, resend, revoke, and delete.

Validation for this iteration: the focused invitation integration suite passed
all 25 tests. Better Stack destination, dashboard, alert, and source-map
verification remain pending external account setup.

## Iteration 19 — admin observability hub

This iteration completed the smallest repo-owned slice of the internal
dashboard work:

- Added the admin-only `/admin/observability` route and an Admin-sidebar entry.
- Added link cards for Better Stack, Cloudflare, Supabase, and Notion
  operations surfaces. Missing URLs remain visible as setup prompts, so local
  development does not require account-specific links.
- Added optional public environment variables to `.env.example` and
  `src/env.ts`: `VITE_BETTER_STACK_DASHBOARD_URL`,
  `VITE_CLOUDFLARE_DASHBOARD_URL`, `VITE_SUPABASE_DASHBOARD_URL`, and
  `VITE_NOTION_OPERATIONS_URL`.
- Updated `docs/plan/OBSERVABILITY.md` so Better Stack is the operator-facing
  replacement for Sentry and the link-only v1 dashboard is recorded as
  implemented. Provider API metrics remain intentionally deferred until
  external dashboards and credentials are operationalized.

Validation for this iteration: the route remains protected by the existing
server-side `checkAdminAccess` guard; `bun run build` and `bun run quality:gate`
passed, including typecheck, formatting, Cloudflare type generation, Fallow,
ESLint without errors, and 1,928 unit tests. Better Stack destinations, real
dashboard URLs, alert delivery, Uptime monitors, and source-map verification
remain external setup work described below.

## Iteration 20 — lesson-authoring structured telemetry

This iteration completed the next high-value server-function slice:

- Course teachers creating lessons now emit `lesson_created` after the lesson
  row is persisted; unexpected insert failures emit `lesson_create_failed`.
- Lesson updates now emit `lesson_updated`, and deletes emit `lesson_deleted`.
  Their persistence failures emit matching stable failure events without
  changing authorization, validation, or delete behavior.
- Every event carries the request ID, server-function path, outcome status,
  duration, actor ID, course ID, and lesson ID when available. Lesson titles,
  body content, URLs, and raw database/provider errors are not logged.
- Integration coverage verifies the success event shape for create, update,
  and delete mutations while existing authorization tests remain unchanged.

Validation for this iteration: the focused course integration suite passed all
46 tests, and formatting passed. Full quality-gate and external Better Stack
verification remain pending for the final handoff.

## Iteration 21 — course-management structured telemetry

This iteration completed the next high-value server-function slice:

- Course creation now emits `course_created` after the row and private
  thumbnail projection complete. Unexpected persistence or signing failures
  emit `course_create_failed`; expected teacher-assignment conflicts emit a
  warning-category rejection event instead of an error.
- Course updates now emit `course_updated` after the content and optional
  teacher-pair mutation completes. Course deletion emits `course_deleted`
  after storage cleanup and row deletion; unexpected failures emit matching
  `course_*_failed` events with the stable `course_persistence` category.
- Every event carries `requestId`, the server-function path, outcome status,
  duration, actor ID, and course ID when available. Course titles,
  descriptions, thumbnail paths, teacher IDs, and raw provider/database
  messages are excluded from telemetry.
- Expected authorization, validation, not-found, and teacher-conflict
  outcomes remain ordinary user-facing results and do not create noisy error
  logs.

Validation for this iteration: the focused course integration suite passed all
46 tests. Full quality-gate, production build, and external Better Stack
verification remain pending for the final handoff.

## Iteration 22 — optional PostHog product-analytics foundation

This iteration completed the smallest repo-owned product-analytics slice after
the technical observability baseline:

- Added `posthog-js` and optional `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST`
  configuration. Missing configuration is a safe no-op, so local and preview
  builds do not emit product data accidentally.
- Added `src/utils/analytics.ts` as the typed browser-only analytics boundary.
  The allow-listed event names cover enrollment, activation, course progress,
  assignment submission, teacher review, and course completion.
- Initialized PostHog from the root route and identify authenticated users with
  stable user ID plus role only. Email, names, lesson text, assignment text,
  mentorship content, and provider secrets are not sent by this boundary.
- Disabled PostHog autocapture and session recording until the privacy review
  and event instrumentation are complete. Logout resets the previous person
  identity so a shared browser does not merge users.
- Updated the product-analytics and observability plans, environment example,
  route documentation, utility documentation, and this handoff.

Validation for this iteration: the focused analytics suite passed 2 tests and
TypeScript typecheck passed. The next product-analytics slice is to wire one
completed journey at a time, starting with enrollment submission, then verify
the events in the configured PostHog project.

## Iteration 23 — enrollment submission product event

This iteration completed the next smallest PostHog roadmap slice:

- The public enrollment form emits `enrollment_submitted` only after
  `createEnrollment` resolves successfully and before the confirmation
  navigation runs.
- The event uses the privacy-safe `source=public_enrollment_form` property;
  names, email addresses, phone numbers, demographic values, and free-form
  application responses are not included.
- Tracking remains optional: the existing analytics boundary returns without
  sending anything when `VITE_POSTHOG_KEY` is absent.
- Placing the capture in the mutation-success handler prevents a page refresh
  on the `?success=true` confirmation URL from counting a duplicate submission.

Verification: focused enrollment-form and analytics tests passed (24 tests),
the full quality gate passed (1,930 unit tests), TypeScript passed, and the
changed files pass formatting. External follow-up remains: verify the event in
the configured PostHog project, then instrument assignment submission and
course progression.

## Iteration 24 — assignment submission product event

This iteration completed the next smallest PostHog roadmap slice:

- Added `trackAssignmentSubmitted` to the typed browser analytics boundary.
- The authenticated assignment detail route calls it only after
  `createOrUpdateSubmission` resolves successfully with `submit=true`.
- Saving a draft does not emit `assignment_submitted`; answer text and other
  free-form submission content are never sent. The event carries only the
  stable `assignmentId` property and remains a safe no-op without a PostHog
  project key.

Verification: the focused analytics suite passed, changed files pass
formatting, and the repository quality gate passed. External follow-up remains:
verify the event in the configured PostHog project, then instrument course
progression.

## Iteration 25 — course start product event

This iteration completed the next smallest PostHog roadmap slice:

- Added `trackCourseStarted` to the typed browser analytics boundary.
- The authenticated course detail route calls it when a student opens the
  first unfinished published lesson, before navigating to the lesson detail.
- Teacher and Admin lesson navigation does not emit the event, and a completed
  first lesson does not count as a new start. The event carries only the stable
  `courseId` property and remains a safe no-op without a PostHog project key.

Verification: the focused analytics suite passed and changed files pass
formatting. External follow-up remains: verify enrollment, assignment, and
course-start events in the configured PostHog project, then assess whether the
existing lesson-progress UI supports a trustworthy `lesson_completed` event.

### PostHog setup required outside the repository

1. Open [PostHog](https://app.posthog.com/) and create or select the DINA
   project.
2. In the project settings, copy the public project key. Put it in the
   deployment environment as `VITE_POSTHOG_KEY`; this key is intended for the
   browser and is not a secret.
3. Set `VITE_POSTHOG_HOST` to the host shown for the project (the default in
   this repository is `https://us.i.posthog.com`). Use the EU host if the
   project was created there.
4. Deploy the build, sign in once, and verify that the project receives the
   automatic pageview plus the later allow-listed journey events. Do not turn
   on autocapture or session recording until private lesson and mentorship
   content masking has been reviewed.
5. Add the PostHog project/dashboard URL to the Admin observability hub only
   when a real URL exists; do not place a project token in a dashboard URL or
   in the repository.

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
Better Stack. Use the canonical bindings for new deployments:

| Binding                 | Value                                             |
| ----------------------- | ------------------------------------------------- |
| `VITE_BETTER_STACK_DSN` | Better Stack Errors browser/application DSN       |
| `BETTER_STACK_DSN`      | Better Stack Errors Worker/application DSN secret |

The old `VITE_SENTRY_DSN` and `SENTRY_DSN` names are accepted only as
fallbacks for rollback. The code still says `Sentry` during this compatibility
phase because the Better Stack Errors ingestion endpoint accepts the Sentry SDK
format. A later cleanup may rename the wrapper helpers after the cutover has
been observed in production.

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

### 5. Configure links for the in-app admin hub

The `/admin/observability` page intentionally stores no provider credentials.
After creating the external dashboards, copy their normal browser URLs into
the deployment environment as the following public variables:

| Variable                          | URL to copy from                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `VITE_BETTER_STACK_DASHBOARD_URL` | Better Stack Telemetry → Dashboards → `DINA — Production Overview` (or the team’s chosen overview dashboard) |
| `VITE_CLOUDFLARE_DASHBOARD_URL`   | Cloudflare → Workers & Pages → `christ-dina` → Observability                                                 |
| `VITE_SUPABASE_DASHBOARD_URL`     | Supabase → project → Database/Reports dashboard                                                              |
| `VITE_NOTION_OPERATIONS_URL`      | The Notion Operations and Runbooks hub page                                                                  |

Set these values separately in local, preview, and production environments as
appropriate. The variables are safe to expose because they are links, not
tokens. Never place Better Stack source tokens, Sentry-compatible DSNs,
Cloudflare API tokens, or Slack webhook URLs in any `VITE_*_DASHBOARD_URL`
variable.

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

| Roadmap item          | Current state                                                                                                                                                                            | Next smallest verifiable slice                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Health checks         | Implemented in `src/server.ts` and `src/utils/health/`                                                                                                                                   | Verify `/healthz` and `/readyz` after deployment                                             |
| Structured logging    | Shared redacted JSON logger covers health/readiness plus high-value auth, enrollment, student, storage, notification, course-authoring, and Admin workflows                              | Migrate remaining high-value server-function families one at a time                          |
| Error tracking        | Better Stack is the canonical DSN configuration with Sentry-compatible SDK wiring and explicit environment/release identity; provider verification is pending                            | Set `VITE_BETTER_STACK_DSN` and `BETTER_STACK_DSN`, then verify ingestion/source maps        |
| Basic metrics         | Cloudflare logs/traces are enabled; no app metrics dashboard is in repo                                                                                                                  | Create Better Stack/Cloudflare dashboard and extract stable log metrics                      |
| Production dashboards | Admin link hub is implemented; Notion dashboard rows and provider URLs are still pending                                                                                                 | Create external dashboards, set the admin hub URL variables, and update existing Notion rows |
| Alerting              | No verified production alert set                                                                                                                                                         | Configure Uptime, error-rate, readiness, and latency alerts; test them                       |
| Product analytics     | Enrollment start/submission, assignment submission, course-start, teacher-review, lesson-completion, and course-completion events are instrumented; project verification remains pending | Verify events and create the initial funnel in PostHog                                       |

### Phase 2 — Reliability

The Notion SLI/SLO catalog has draft entries for web availability, application
error rate, and database restore confidence. Keep them as `Needs data`/`Draft`
until Better Stack and Cloudflare telemetry are visible and the restore drill
has produced dated evidence. Then attach real dashboard and runbook links and
set review dates. The remaining work is:

- error-budget policy;
- backup/restore validation evidence (procedure is documented; first drill is
  still pending); and
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

Initial query/index review is implemented for the community feed, comments,
and notification inbox; hosted `EXPLAIN` evidence is still pending. Prioritize
request latency charts, connection pressure, pagination/rate-limit review,
caching, load tests, and a background-job decision from production data.

### Phase 5 — Security

Dependency audit reporting is implemented in `.github/workflows/dependency-security.yml`
and weekly Dependabot checks are enabled. The high/critical baseline is clear and
the workflow blocks future high/critical findings while retaining lower-severity
JSON reports for routine triage. Calendar event listing now has server-side
teacher/admin enforcement in addition to the route guard. The remaining work is
broader RBAC/RLS review, admin access hardening, secret inventory, Better Stack
audit-event verification, and threat modeling. Better Stack must not receive passwords,
tokens, cookies, service-role keys, connection strings, raw submission text, or
private mentorship content. See `docs/plan/SECURITY.md`.

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

## Iteration 27 — observability runbook

This iteration completed the next repository-owned reliability slice:

- Added `docs/observability-runbook.md` covering Worker/site availability,
  database readiness, sustained 5xx errors, latency regressions, auth failures,
  storage/external dependency failures, and telemetry-provider failures.
- Added a consistent `SEV0`–`SEV3` severity model, role-based escalation, a
  five-minute triage checklist, Notion Incident Database workflow, safe evidence
  rules, reversible mitigation, recovery checks, and closure/post-incident
  review steps.
- Marked the runbook step complete in `docs/plan/OBSERVABILITY.md` and added it
  to the repository navigation in `AGENTS.md`.

The runbook is intentionally `Draft` until the external Better Stack and
Cloudflare dashboards, alert routes, Uptime monitors, Slack incident channel,
and named service owners exist. Account-specific values remain documented as
setup instructions below rather than committed to the repository.

Validation for this iteration: targeted Markdown formatting,
`bun run docs:notion-check --json`, and `bun run quality:gate` passed with
1,933 unit tests. The gate reported only pre-existing lint/Fallow warnings;
no runtime behavior changed.

## Iteration 28 — course-teacher assignment telemetry

This iteration completed the next repository-owned structured-logging slice:

- The direct Admin `updateCourseTeachers` server function now emits a redacted
  `course_teachers_updated` event with `requestId`, server-function path,
  status, duration, actor/course IDs, and both assigned teacher IDs.
- Unexpected assignment-replacement failures emit the stable
  `course_teacher_assignment_persistence` category without raw database or
  provider details. Expected authorization, validation, conflict, and
  not-found outcomes remain ordinary user-facing failures and are not logged
  as noisy operational errors.
- Integration coverage verifies the successful event shape and that a missing
  course does not generate an operational error event.

The broader Better Stack destination, dashboard, alert, Uptime, source-map,
Slack, and named-owner setup remains account-specific work documented above.

## Iteration 29 — discipleship mutation telemetry

This iteration completed the next repository-owned structured-logging slice:

- Discipleship assignment, pairing, and individual/pair/group schedule
  mutations now emit shared redacted `discipleship_mutation_completed` and
  `discipleship_mutation_failed` events.
- Events include request correlation, server-function action, actor ID, safe
  student/teacher/pair IDs, schedule type where relevant, outcome status, and
  duration. Schedule timestamps, private profile data, and raw persistence or
  provider details are excluded.
- Expected authorization, not-found, and pairing-conflict outcomes remain
  ordinary user-facing failures and do not create noisy error telemetry.

Focused verification passed: the discipleship integration suite (7 tests),
full integration (327 tests), typecheck, formatting, and quality:gate. Better
Stack destination, dashboard, alert, Uptime, source-map, Slack, and named-owner
setup remains pending external account configuration.

## Iteration 31 — post and comment mutation telemetry

This iteration completed the next high-value structured-logging slice for the
community post/comment workflow:

- Post and comment create, update, and delete mutations now emit redacted
  `post_created`, `post_updated`, `post_deleted`, `comment_created`,
  `comment_updated`, and `comment_deleted` events.
- Events include request correlation, server-function path, actor ID,
  post/comment/course IDs where available, success status, and duration. Post
  and comment content, author profile data, and raw persistence/provider
  details are excluded.
- Unexpected persistence failures use stable `post_persistence` or
  `comment_persistence` categories. Expected not-found and authorization
  outcomes remain ordinary user-facing failures and do not create noisy error
  telemetry.
- Integration coverage verifies all six success event shapes, duration fields,
  content exclusion, and suppression of an expected missing-post failure.

The next repository-owned structured-logging candidate after this iteration is
the next uninstrumented server-function family. Better Stack destination,
dashboard, alert, Uptime, source-map, Slack, and named-owner setup remains
account-specific external work described above.

## Iteration 32 — post and comment reaction telemetry

This iteration completed the next repository-owned structured-logging slice for
community reactions:

- Post and comment reaction toggles now emit redacted
  `post_reaction_toggled` and `comment_reaction_toggled` success events.
- Events include request correlation, server-function path, actor ID, target
  ID, reaction action (`added`, `removed`, or `updated`), emoji, status, and
  duration. Reaction content is allow-listed input; no post/comment bodies or
  raw persistence details are logged.
- Unexpected reaction persistence failures emit the shared
  `post_mutation_failed` event with stable `post_reaction_persistence` or
  `comment_reaction_persistence` categories. Existing toggle behavior and
  expected error propagation are unchanged.
- Integration coverage verifies both success event shapes, redacted stable
  failure categories, target IDs, action fields, and duration metadata.

Validation: the focused post integration suite passed with 28 tests, the full
integration suite passed with 333 tests, `bun run quality:gate` passed with
1,933 unit tests, and the production build passed. TypeScript, Cloudflare type
generation, formatting, and `git diff --check` also passed; only existing
deprecation, lint, Fallow, and large-chunk warnings remain. External Better
Stack destination, dashboard, alert, Uptime, source-map, Slack, and named-owner
setup remains account-specific work described above.

## Iteration 33 — post-notification read-state telemetry

This iteration completed the next repository-owned structured-logging slice for
the notification inbox:

- Group and mark-all read-state mutations now emit redacted
  `notification_group_marked_read` and `notifications_marked_read` success
  events. Events include request correlation, server-function path, actor ID,
  target/event metadata where applicable, read scope, status, and duration.
- Unexpected read-state persistence failures emit
  `notification_read_state_failed` with the stable
  `notification_read_state_persistence` category. Notification content and raw
  database details remain excluded.
- Existing optimistic UI, authorization boundary, and read-state behavior are
  unchanged. Integration coverage verifies both success event shapes and the
  stable redacted failure category.

Validation: focused notification integration passed all 8 tests, full integration
passed all 336 tests, `bun run quality:gate` passed with 1,933 unit tests, and
the production build passed. External Better Stack destination, dashboard,
alert, Uptime, source-map, Slack, and named-owner setup remains
account-specific work described above.

## Iteration 34 — Zoom-link Admin mutation telemetry

This iteration completed the next repository-owned structured-logging slice:

- Admin Zoom-link create, update, and delete mutations now emit redacted
  `zoom_link_created`, `zoom_link_updated`, and `zoom_link_deleted` events.
- Events carry request correlation, server-function path, actor/link IDs,
  section, teacher ownership, status, and duration. Zoom URLs, meeting IDs,
  passcodes, titles, and raw persistence details are excluded; unexpected
  repository failures use the stable `zoom_link_persistence` category.
- Focused Zoom-link integration telemetry and the existing Zoom-link suite
  verify the event shape and that meeting credentials and URLs never enter the
  structured logs. External Better Stack destination, dashboard, alert,
  Uptime, source-map, Slack, and named-owner setup remains pending.

## Iteration 35 — media-library CRUD telemetry

This iteration completed the next repository-owned structured-logging slice:

- Media-library create, update, and delete mutations now emit redacted
  `media_created`, `media_updated`, and `media_deleted` events.
- Events carry request correlation, server-function path, actor/media IDs,
  media kind, course ID where applicable, status, and duration. Media titles,
  descriptions, external URLs, private storage paths, and raw persistence or
  storage-provider details are excluded.
- Unexpected persistence or storage failures emit the stable
  `media_mutation_failed` event with `media_persistence`; expected role,
  authorization, not-found, and validation outcomes remain outside noisy error
  telemetry.
- Integration coverage verifies all three success event shapes, duration and
  safe-field metadata, privacy exclusions, and redaction of raw storage
  failures.

Validation: focused library integration passed all 20 tests. Better Stack
destination, dashboard, alert, Uptime, source-map, Slack, and named-owner
setup remains account-specific external work described above.

## Iteration 36 — exam-authoring structured telemetry

This iteration completed the next repository-owned structured-logging slice:

- Exam create, save, and publish mutations now emit redacted
  `exam_created`, `exam_updated`, and `exam_published` events.
- Events carry request correlation, server-function path, actor/exam IDs,
  draft/published status, safe question counters, and duration. Exam titles,
  open/close dates, question prompts, option labels, and raw persistence
  details remain excluded.
- Unexpected repository failures use the stable `exam_persistence` category;
  expected authorization, validation, not-found, and conflict outcomes remain
  outside noisy error telemetry.
- Integration coverage verifies the three success event shapes, safe metadata,
  duration fields, and privacy exclusions while preserving the existing exam
  authoring behavior.

Validation: focused exam integration passed all 16 tests. Better Stack
destination, dashboard, alert, Uptime, source-map, Slack, and named-owner
setup remains account-specific external work described above.

## Iteration 37 — exam-taking structured telemetry

This iteration completed the next repository-owned structured-logging slice:

- Starting a published exam now emits `exam_attempt_started` for a new
  attempt and `exam_attempt_resumed` when an existing attempt is reopened.
- Autosaved answers now emit `exam_answer_saved` with safe student, attempt,
  exam, question, and question-type metadata. Selected option IDs and free-form
  answer text are never sent to Better Stack/Cloudflare telemetry.
- Unexpected persistence failures emit stable error events without raw
  database/provider details. Expected authorization, not-found, validation,
  and expired-attempt outcomes remain ordinary user-facing results.
- Existing submit-attempt telemetry now shares the same action-aware path and
  student/attempt/exam context fields.

Validation: focused exam integration passed all 17 tests. Better Stack
destination, dashboard, alert, Uptime, source-map, Slack, and named-owner
setup remains account-specific external work described above.

## Iteration 38 — exam-grading structured telemetry

This iteration completed the next repository-owned structured-logging slice:

- Manual open-answer grading now emits redacted `exam_open_answer_graded`
  success events, and finalizing a submitted attempt emits
  `exam_grading_finalized`. Events carry request correlation,
  server-function path, grader/attempt/exam IDs, answer or question IDs where
  applicable, question type, status, and duration.
- Unexpected grading persistence failures emit stable
  `exam_open_answer_grade_failed` or `exam_grading_finalize_failed` events with
  the `exam_grading_persistence` category. Authorization, conflict, not-found,
  and validation outcomes remain ordinary user-facing results.
- Awarded points, aggregate scores, answer text, and raw database/provider
  details are excluded from Better Stack/Cloudflare telemetry. Existing
  grading behavior and score calculations are unchanged.
- Integration coverage verifies both success event shapes, duration metadata,
  failure categorization, and privacy exclusions.

Validation: focused exam integration passed all 18 tests, full integration
passed all 342 tests, `bun run quality:gate` passed with 1,933 unit tests, and
the production build passed. TypeScript, Cloudflare type generation,
formatting, static checks, and `git diff --check` also passed; only existing
deprecation, lint, Fallow, and large-chunk warnings remain. External Better
Stack destination, dashboard, alert, Uptime, source-map, Slack, and
named-owner verification remains account-specific setup work described above.

## Iteration 39 — enrollment lifecycle structured telemetry

This iteration completed the next repository-owned structured-logging slice:

- Admin enrollment status updates, special-case toggles, and deletions now emit
  redacted `enrollment_status_updated`,
  `enrollment_special_case_updated`, and `enrollment_deleted` events.
- Events carry request correlation, server-function path, actor/enrollment IDs,
  safe status or boolean outcome metadata where relevant, and duration. Raw
  enrollment content, database details, and provider messages are excluded.
- Unexpected persistence failures emit stable
  `enrollment_status_persistence`, `enrollment_special_case_persistence`, or
  `enrollment_delete_persistence` categories; expected authorization behavior
  remains outside noisy operational telemetry.
- Integration coverage verifies all three success event shapes, persistence
  behavior, duration fields, stable failure categories, and exclusion of raw
  database details.

Validation: focused enrollment integration passed all 32 tests. Full quality
and external Better Stack/Cloudflare verification remain the standard final
checks and account-specific setup described above.

## Iteration 40 — attendance-management structured telemetry

This iteration completed the next repository-owned structured-logging slice:

- Attendance session open/re-open, close, and Course Teacher/Admin/privileged
  student overrides now emit redacted `attendance_session_opened`,
  `attendance_session_closed`, and `attendance_override_updated` events.
- Events carry request correlation, server-function path, actor/course/lesson
  metadata, target student IDs where applicable, safe outcome status, and
  duration. Attendance timestamps and raw database/provider details are not
  sent to Better Stack/Cloudflare telemetry.
- Unexpected persistence failures use stable
  `attendance_session_open_persistence`,
  `attendance_session_close_persistence`, and
  `attendance_override_persistence` categories. Expected authorization,
  not-found, validation, and attendance-window conflicts remain ordinary
  user-facing outcomes and do not create noisy error telemetry.
- Integration coverage verifies all three management event paths, both
  override directions, safe metadata, and duration fields.

External Better Stack destination, dashboard, alert, Uptime, source-map,
Slack, and named-owner verification remains account-specific setup work. The
repository handoff above remains the source for the required dashboard links,
secrets, alert thresholds, and rollback procedure.

## Iteration 41 — assignment-authoring structured telemetry

This iteration completed the next repository-owned structured-logging slice:

- Assignment create, update, and delete mutations now emit redacted
  `assignment_created`, `assignment_updated`, and `assignment_deleted` events
  with request correlation, server-function path, actor/course/lesson/
  assignment IDs, safe assignment status, and duration.
- Assignment titles, descriptions, due dates, and raw database/provider details
  are excluded from Better Stack/Cloudflare telemetry. Unexpected persistence
  failures use the stable `assignment_persistence` category; expected
  authorization, not-found, and submission-count validation outcomes remain
  ordinary user-facing results.
- Integration coverage verifies all three success event shapes, duration
  metadata, and the exclusion of assignment content from telemetry.

The next in-repo structured-logging slice should target an uninstrumented
mutating family such as remaining enrollment distribution/substitution or
assignment-independent administration actions. Better Stack destinations,
dashboards, alerts, Uptime, source maps, Slack routing, and named ownership
remain account-specific external setup work.

## Iteration 42 — enrollment distribution and teacher substitution telemetry

This iteration completed the next repository-owned structured-logging slice:

- Enrollment distribution now emits redacted
  `enrollment_distribution_completed` events for both assigned and no-op
  runs. Events carry request correlation, actor ID, assigned/unassigned/reviewer
  counters, status, and duration.
- Teacher substitution activation now emits
  `enrollment_substitution_completed` with actor, absent/substitute teacher,
  course, reassignment count, status, and duration. Ending a substitution emits
  `enrollment_substitution_ended` with the actor, absent teacher, removed-row
  count, status, and duration.
- Unexpected repository failures emit stable
  `enrollment_distribution_persistence`,
  `enrollment_substitution_persistence`, or
  `enrollment_substitution_end_persistence` categories. Applicant content,
  timestamps, and raw database/provider details remain excluded; expected
  authorization and not-found outcomes remain ordinary user-facing results.
- Integration coverage verifies completion event shapes, safe counters and
  identifiers, redaction, duration metadata, and all three stable failure
  categories.

Validation: the focused enrollment integration suite passed all 35 tests.

## Iteration 43 — bulk enrollment grading telemetry

This iteration completed the next repository-owned structured-logging slice:

- Bulk enrollment grading now emits a redacted
  `enrollment_bulk_grade_completed` event for both dry-run previews and status
  execution. Events carry request correlation, actor ID, configured thresholds,
  dry-run mode, awaiting-approval and special-case counts, approved/waitlisted/
  rejected totals, and duration.
- Repository read and update failures emit the same
  `enrollment_bulk_grade_failed` event with stable
  `enrollment_bulk_grade_read_persistence` or
  `enrollment_bulk_grade_update_persistence` categories. Enrollment IDs,
  applicant content, and raw database/provider details remain excluded.
- Integration coverage verifies preview and execute event shapes, threshold
  assignments, safe counters, duration metadata, and both stable failure
  categories without raw errors.

Validation: the focused enrollment integration suite passed all 38 tests.
The next in-repo structured-logging slice should target another uninstrumented
mutating family or assignment-independent administration action. Better Stack
destinations, dashboards, alerts, Uptime, source maps, Slack routing, and named
ownership remain account-specific external setup work.

## Iteration 44 — login structured telemetry

This iteration completed the next repository-owned structured-logging slice:

- Supabase password sign-in now runs through `src/utils/auth/login.ts` and
  emits redacted `login_succeeded` / `login_failed` events with request
  correlation, server-function path, outcome status, duration, and a stable
  `auth_sign_in` error category plus provider code for rejected attempts.
- Successful events include only the authenticated user ID; login email,
  password, and raw provider messages are excluded from operational telemetry.
  Existing login return values and the client-side error-message mapping are
  unchanged.
- Integration coverage verifies safe success metadata, request correlation,
  rejection status, provider-code categorization, raw-message exclusion, and
  preservation of the existing user-facing rejection message.

Validation: focused login integration tests pass. Better Stack destinations,
dashboards, alerts, Uptime, source maps, Slack routing, and named ownership
remain account-specific external setup work.

## Iteration 45 — logout structured telemetry

This iteration completed the next repository-owned structured-logging slice:

- Supabase sign-out now runs through `src/utils/auth/logout.ts` and emits
  redacted `logout_succeeded` / `logout_failed` events with request
  correlation, server-function path, outcome status, duration, and the stable
  `auth_sign_out` error category plus provider code when Supabase returns an
  error.
- Provider messages, tokens, connection strings, email addresses, and thrown
  exception text remain outside structured telemetry. Existing sign-out return
  behavior and redirect behavior are unchanged.
- Integration coverage verifies successful sign-out metadata, returned
  provider-error redaction/message preservation, and thrown-provider-error
  redaction.

Validation: focused logout integration tests (3), targeted Prettier, `git diff
--check`, and `bun run quality:gate` passed with 1,933 unit tests. Better Stack
destinations, dashboards, alerts, Uptime, source maps, Slack routing, and named
ownership remain account-specific external setup work.

## Iteration 46 — authenticated password-change telemetry

This iteration completed the next repository-owned auth structured-logging slice:

- Authenticated profile password changes now run through
  `src/utils/profile/service/profile.service.ts` and emit redacted
  `password_updated` / `password_update_failed` events with request
  correlation, `serverFn:updatePassword`, user ID, outcome status, duration,
  stable `password_update` error categorization, and provider code when
  Supabase returns one.
- Password values, provider messages, and thrown exception text remain outside
  structured telemetry. Existing `PASSWORD_UPDATE_FAILED` user-facing error
  behavior is preserved while the server-function adapter now authenticates
  before delegating to the service.
- Added three integration tests covering success, returned provider errors, and
  thrown provider exceptions with message/password exclusion assertions.

Validation: focused profile integration tests (12) and TypeScript typecheck
passed. Better Stack destinations, dashboards, alerts, Uptime, source maps,
Slack routing, and named ownership remain account-specific external setup work.

## Iteration 47 — public enrollment persistence telemetry

This iteration completed the next repository-owned structured-logging slice:

- Public enrollment persistence now emits `enrollment_created` after the
  enrollment row is written and `enrollment_create_failed` when persistence
  fails.
- Events carry request correlation, `serverFn:createEnrollment`, the stable
  `public_enrollment_form` source, outcome status, duration, and the generated
  enrollment ID only after success.
- Applicant names, email addresses, phone numbers, demographic fields,
  application responses, and raw database/provider errors remain outside
  structured telemetry. Existing enrollment-closed behavior is unchanged.
- Integration coverage verifies request correlation, success/failure event
  shape, duration, and privacy-safe failure logging.

Validation: focused enrollment integration tests (40) passed. Better Stack
destinations, dashboards, alerts, Uptime monitors, source maps, Slack routing,
and named ownership remain account-specific external setup work.

## Iteration 48 — manual enrollment invitation telemetry

This iteration completed the next repository-owned structured-logging slice:

- Manual Admin sends from an enrollment now emit a redacted
  `enrollment_invitation_sent` event after the invitation is persisted, emailed,
  and linked to the enrollment.
- Failed invitation persistence or email delivery emits
  `enrollment_invitation_failed` with request correlation, actor/enrollment and
  invitation IDs where available, `new` or `resend` mode, duration, and a stable
  `enrollment_invitation_email_delivery` or
  `enrollment_invitation_persistence` category.
- Expected authorization, not-found, conflict, and validation outcomes remain
  ordinary user-facing errors. Recipient addresses, invitation tokens, and
  provider exception text remain outside structured telemetry; rollback behavior
  is unchanged.
- Integration coverage verifies the successful event contract, request ID,
  provider failure categorization, rollback, and sensitive-data exclusion.

Validation: focused enrollment integration tests (43) passed. Better Stack
destinations, dashboards, alerts, Uptime monitors, source maps, Slack routing,
and named ownership remain account-specific external setup work.

## Iteration 49 — lesson completion and product analytics

This iteration completed the previously deferred lesson-completion slice by
adding a real student action backed by the existing progress table:

- Added `completeLesson` with UUID validation, authenticated student-only
  access, and a published-lesson check. Expected authorization/not-found
  outcomes remain ordinary user-facing errors.
- Added a unique `(student_id, lesson_id)` database index and an idempotent
  progress upsert. Repeated requests return `alreadyCompleted=true` and do not
  create duplicate progress rows.
- The lesson detail page now returns the student's current completion state and
  shows a design-system completion control only to students viewing published
  content. Teachers and Admins retain their existing lesson-content view.
- Added redacted `lesson_completed`, `lesson_completion_ignored`, and
  `lesson_completion_failed` structured events with request correlation,
  actor/course/lesson IDs, status, duration, and stable persistence categories.
  Lesson titles, content, and raw database details are excluded.
- Added the allow-listed PostHog `lesson_completed` event. It sends only the
  stable lesson ID and is captured only after the first persistence mutation
  succeeds, so refreshes and repeat requests do not inflate completion counts.
- Added integration coverage for success, idempotency, privacy-safe logging,
  published-lesson authorization, analytics capture, and the new unique index.

Validation: focused analytics tests (2), focused course integration tests (49),
TypeScript typecheck, migration generation, targeted formatting, and the
production-quality checks for the changed paths passed. The generated migration
is `drizzle/0046_skinny_korath.sql`.

### Migration preflight for hosted databases

Before applying migration `0046` to an existing Supabase environment, open the
Supabase SQL Editor and confirm that the new unique index will not encounter
legacy duplicate progress rows:

```sql
SELECT student_id, lesson_id, COUNT(*) AS row_count
FROM lesson_progress
GROUP BY student_id, lesson_id
HAVING COUNT(*) > 1;
```

The query must return zero rows before migration. If it returns rows, reconcile
the duplicate records in a reviewed SQL change while preserving the completed
record and its earliest completion timestamp, then rerun the query. The
migration intentionally fails closed instead of silently deleting progress.

## Iteration 50 — course completion product analytics

This iteration completed the next independently verifiable PostHog journey
slice now that lesson completion has a reliable persisted boundary:

- Added `isCourseCompleted(studentId, courseId)` to compare all published
  lessons with the student's completed progress rows.
- `completeLessonService` returns `courseCompleted=true` only when the current
  request completes the final published lesson; repeated completion requests
  return `courseCompleted=false`.
- Added `trackCourseCompleted(courseId)` to the typed browser analytics boundary.
  The lesson route emits `course_completed` only after a first successful
  completion and sends only the stable course ID.
- Added unit and integration coverage for the event contract, one-lesson
  courses, multi-lesson finalization, and duplicate suppression.

Validation: focused analytics tests and the course integration suite passed.
Full quality-gate verification and the external PostHog project/dashboard
verification remain follow-up work. Better Stack account setup remains
documented above and is unaffected by this product-analytics event.

## Iteration 86 — js-yaml dependency remediation

This iteration completed the next isolated Phase 5 dependency-security slice:

- Added a root Bun/npm override resolving the ESLint, shadcn, and TanStack Start
  development-tool chains to patched `js-yaml@4.3.x` instead of vulnerable
  `4.1.1`.
- This covers the three high-severity quadratic-CPU YAML merge-key advisories
  without changing application runtime behavior; all current consumers declare
  compatible `4.x` ranges.
- Updated `docs/plan/SECURITY.md` with the advisory links, reachability,
  remediation evidence, and the reduced residual baseline.

Validation passed: frozen install, post-change audit, formatting, diff checks,
quality gate with 1,953 unit tests, 379 integration tests, and production build.
Notion Engineering Roadmap, Dependency Security maturity, and Maturity Tracking
were synchronized; the protected Production Readiness template was left
unchanged because no launch decision changed.

## Iteration 87 — ip-address dependency remediation

This iteration completed the next isolated Phase 5 dependency-security slice:

- Added a root Bun/npm override resolving shadcn's Model Context Protocol and
  express-rate-limit development-tool chain to patched `ip-address@10.7.0`
  (with a `^10.3.1` floor) instead of vulnerable `10.1.0`.
- This covers [GHSA-mwp4-54f8-5fhr](https://github.com/advisories/GHSA-mwp4-54f8-5fhr),
  which affects `ip-address` through `10.3.0`; the compatible override does not
  change application runtime behavior.
- Updated `docs/plan/SECURITY.md` with the advisory, reachability, remediation
  evidence, and reduced residual baseline.

Validation passed: frozen install, post-change `bun audit --audit-level=high`
(expected exit 1 with 8 residual high findings), formatting, `git diff --check`,
`bun run quality:gate` with 1,953 unit tests, `bun run test:integration` with
379 tests, and production build. Notion Engineering Roadmap, Dependency
Security maturity, and Maturity Tracking were synchronized; the protected
Production Readiness template was left unchanged because no launch decision
changed.

## Iteration 88 — major dependency and build-tool refresh

This iteration completed the requested major dependency refresh on the existing
GNHRF implementation branch:

- Upgraded the Vite toolchain to Vite `8.3.0`, Vitest `5.0.0`, the React Vite
  plugin `6.1.1`, TanStack devtools Vite `0.8.5`, and the Vite 8 React Compiler
  integration. The current lockfile resolves one Vite package; the root Vite
  override is now `^8.3.0`.
- Upgraded TanStack Table to `9.2.4` while using its legacy compatibility API
  for the existing table behavior, and upgraded Supabase SSR/JS, Lucide, Motion,
  jsdom, dotenv, coverage tooling, and the related lint/build packages.
- Replaced the standalone Vite TypeScript-path plugin with Vite/Vitest native
  `resolve.tsconfigPaths` support. TypeScript is `6.0.3`, the latest version
  compatible with the current `typescript-eslint` parser; TypeScript 7 remains
  pending upstream parser support.
- Revalidated the existing security overrides. The old Vite 7 historical entry
  above remains an iteration record; the current package and lockfile use Vite 8.
  The remaining audit baseline is 7 high transitive findings and stays
  report-only while those packages are triaged separately.

Validation passed: `bun run quality:gate` with 1,953 unit tests,
`bun run test:integration` with 379 tests, TypeScript, formatting, `git diff --check`,
and the production build. Notion Dependency Security maturity and Maturity
Tracking records were synchronized; the protected Production Readiness template
was left unchanged because no launch decision changed.

## Iteration 89 — transitive tooling audit follow-up

This iteration followed up on the remaining high-severity dependency findings
after the major dependency refresh:

- Upgraded `@cloudflare/vite-plugin` to `1.54.7` and `wrangler` to `4.131.0`.
  The refreshed Miniflare path resolves patched `sharp@0.35.4` and
  `undici@7.29.0`, removing the previous sharp and Cloudflare-tooling undici
  findings.
- Added a compatible root Hono floor at `^4.13.7`, removing the prior Hono
  finding without changing application runtime behavior.
- The current audit reports four High findings across three transitive,
  development-only packages: shadcn's `undici@7.28.0`, its MCP/Express/router
  path's `path-to-regexp@8.3.0`, and two audit entries tied to the legacy
  micromatch branch retaining `picomatch@2.3.1`. Their advisories cover cache-directive information
  disclosure/parse-time crash, optional-group denial of service, and extglob
  regular-expression denial of service, respectively.
- These findings are not in the deployed Worker/browser runtime. A global
  override is unsafe because Wrangler requires the path-to-regexp 6.x line and
  modern Vite/Rolldown requires picomatch 4.x. Bun has no consumer-specific
  nested override mechanism.
- No patch files were added, per the task direction. A clean lockfile
  regeneration can select patched nested versions but would also refresh many
  unrelated compatible packages, so it was not taken in this scoped change.
  The audit remains report-only for these four findings pending an upstream
  release, nested-override support, or a separately reviewed patch-file change.

Validation passed: the post-change audit reports exactly these four High
findings; quality gate with 1,953 unit tests, integration with 379 tests,
typecheck, formatting, `git diff --check`, production build, and
`bun run docs:notion-check` all passed. The Dependency Security and Maturity
Tracking Notion records were synchronized; Architecture Inventory, Service
Catalog, and Production Readiness targets were skipped because this follow-up
changed dependency/tooling state but no service shape or launch decision.

## Iteration 90 — student-directory service authorization hardening

This iteration closed the next concrete Phase 5 RBAC service-boundary gap:

- `getStudentsService` and `getStudentDetailService` now require a persisted
  teacher or Admin role before reading student-directory data. The check runs
  inside the service layer so direct callers cannot bypass the server-function
  wrapper's route authorization.
- The `getStudents` and `getStudentDetail` adapters now authenticate once and
  pass the resulting actor ID into their services; behavior and response
  shapes for authorized teachers/Admins are unchanged.
- Added integration coverage proving direct student calls are rejected before
  the sensitive student list/detail read.

Validation passed: the focused student integration suite (9 tests). The full
quality gate and Notion security/roadmap synchronization remain part of final
handoff validation.

## Iteration 91 — calendar-event mutation authorization hardening

This iteration closed the next concrete Phase 5 RBAC service-boundary gap:

- Calendar event listing and create/update/delete services now share a
  teacher-or-Admin authorization check. The browser route remains a UX guard,
  while direct service/server-function calls are rejected before event reads or
  writes.
- Added integration coverage proving student denial for create, update, and
  delete while preserving the existing teacher/Admin behavior and redacted
  calendar-event telemetry.
- Updated `docs/plan/SECURITY.md`, `docs/plan/THREAT_MODEL.md`, and the
  `src/utils` boundary documentation.

Validation passed: focused event integration (4 tests), full integration (382
tests), quality gate (1,953 unit tests), formatting, typecheck, and production
build. Notion security/roadmap synchronization completed after local
verification; the protected production-readiness template was left unchanged.

## Iteration 92 — post read service authorization hardening

This iteration closed the next concrete Phase 5 RBAC service-boundary gap:

- Post channel, paginated feed, single-post, and comment read services now
  require a persisted caller profile before querying community data.
- The authenticated actor ID is passed from each server-function adapter into
  the service layer, preserving the existing response shapes and access for
  all persisted roles.
- Added integration coverage proving unknown actors are rejected before each
  post read path while the existing pagination, channel, and post-not-found
  behavior remains intact.

Validation passed: focused post integration (37 tests), formatting, and
`git diff --check`. The full quality gate, full integration suite, and Notion
security/roadmap synchronization remain final handoff checks for this slice;
the protected production-readiness template remains unchanged because no
launch decision changed.

## Iteration 93 — lesson read authorization hardening

This iteration closed the next concrete Phase 5 RBAC service-boundary gap:

- Lesson detail reads now reject unpublished lessons for students and teachers
  who do not manage the course.
- Published lesson responses filter out draft/closed assignments for
  non-managers, while course teachers and admins retain the full authoring
  view.
- Added integration coverage for student assignment filtering, student draft
  denial, and course-teacher draft access.
- Updated `docs/plan/SECURITY.md`, `docs/plan/THREAT_MODEL.md`, and the
  `src/utils` boundary documentation.

Validation passed: focused assignment integration, full integration, the
quality gate, formatting, typecheck, and production build. The existing
Assignments and submissions Architecture Inventory row was synchronized in
Notion. Service Catalog and the protected Production Readiness template were
left unchanged because ownership, SLOs, and launch decisions did not change;
the Engineering Roadmap received no append because its phase status and core
work list remain unchanged.

## Iteration 94 — post mutation service authorization hardening

This iteration closed the next concrete Phase 5 service-boundary gap:

- Post and comment create, update, and delete services plus post/comment
  reaction services now require the caller's persisted profile before reading
  or changing community data. Post moderation capability is derived from that
  persisted role; existing ownership and Teacher/Admin moderation checks are
  unchanged.
- Added integration regressions proving unknown actors are rejected before
  post, comment, and reaction mutation paths can proceed.
- Updated `docs/plan/SECURITY.md`, `docs/plan/THREAT_MODEL.md`, and the
  `src/utils` service-boundary inventory.

Validation: focused post integration tests (45), full integration (397),
`bun run quality:gate`, and the production build passed. Better Stack/Cloudflare
provider acceptance, hosted RLS verification, and the remaining public-abuse
controls remain external follow-up work.

## Iteration 95 — post-notification service authorization hardening

This iteration closed the next small Phase 5 service-boundary gap:

- Notification summary reads and group/all mark-read mutations now require a
  persisted caller profile inside `notification.service.ts`. Unknown direct
  callers can no longer receive an empty notification summary or get a
  successful no-op read-state response.
- The existing server-function authentication, per-user notification queries,
  read-state semantics, telemetry fields, and response shapes for valid users
  remain unchanged.
- Added integration coverage that calls all three notification service
  operations with an unknown actor and verifies `NotFoundError` before the
  repository path.

Validation: the focused notification integration suite passed all 9 tests;
full integration passed all 398 tests, `bun run quality:gate` passed with 1,953
unit tests, the production build passed, and the Architecture Inventory plus
Engineering Roadmap were synchronized in Notion. Production Readiness was
skipped because the database contains only its protected template row.

## Iteration 96 — private avatar storage service authorization hardening

This iteration closed the next small Phase 5 storage-boundary gap:

- Avatar upload request and completion services now require a persisted profile
  before minting an actor-owned signed upload or accepting an avatar path.
- Unknown direct callers fail before the service-role storage client is used;
  valid profile behavior, ownership validation, cleanup, and signed response
  behavior remain unchanged.
- Added integration coverage for unknown actors on both avatar operations and
  updated the security, threat-model, and utility boundary documentation.

Validation: focused image-upload integration passed all 12 tests; full
integration passed all 400 tests, `bun run quality:gate` passed with 1,953 unit
tests, the production build and formatting passed, and Architecture Inventory
plus Engineering Roadmap were synchronized in Notion. Hosted storage-policy
and Better Stack/Cloudflare acceptance remain external follow-up work.

## Iteration 97 — media-library service authorization hardening

This iteration closed the next small Phase 5 service-boundary gap:

- Media-library reads, CRUD mutations, and private upload helpers now resolve
  the caller role from the persisted profile inside `library.service.ts`.
- Server-function adapters pass only the authenticated user ID; callers can no
  longer forge a `teacher` or `admin` role to bypass publication filtering or
  staff/ownership checks.
- Updated integration coverage for persisted student/teacher roles and unknown
  actors, while preserving media response, ownership, signing, and cleanup
  behavior.

Validation: focused library integration passed all 21 tests. Full integration,
the quality gate, production build, formatting, and Notion synchronization are
the remaining handoff checks for this slice; Better Stack/Cloudflare acceptance
and hosted storage-policy verification remain external follow-up work.

## Iteration 98 — campaign lock service authorization hardening

This iteration closed the next small Phase 5 admin service-boundary gap:

- Email and WhatsApp campaign lock inspection and explicit release now delegate
  to Admin-guarded services instead of calling repositories directly from the
  server-function adapters.
- Campaign preview/send behavior and per-user lock ownership are unchanged;
  direct teacher callers now receive the same typed authorization failure as
  other campaign operations.
- Added integration coverage proving teacher denial and Admin inspection/release
  behavior for both campaign families.

Validation: focused email and WhatsApp integration passed all 32 tests. The full
integration suite, quality gate, production build, formatting, and Notion
synchronization remain final handoff checks for this slice; Better Stack
acceptance and provider rehearsal remain external follow-up work.

## Iteration 99 — exam-taking service authorization hardening

This iteration closed the next small Phase 5 service-boundary gap:

- Student exam listing, attempt start/resume, answer autosave, and submission
  services now require the caller's persisted `student` role through `authz`.
  Unknown direct callers can no longer pass the former staff-only exclusion
  check and reach the published-exam read or attempt lifecycle paths.
- Added integration coverage for unknown callers against the student exam list
  and attempt-start surfaces; authorized student behavior and teacher/Admin
  grading boundaries remain unchanged.
- Updated `docs/plan/SECURITY.md`, `docs/plan/THREAT_MODEL.md`, and the
  `src/utils` boundary inventory. Better Stack/Cloudflare acceptance, hosted
  RLS verification, and public-abuse controls remain external follow-up work.

## Iteration 100 — Cloudflare WAF public endpoint abuse-control runbook

This iteration turns the remaining public-endpoint abuse item into an
individually executable external procedure. No application code, Wrangler
configuration, Cloudflare API token, or production rule ID is changed here.
The repository continues to keep enrollment closed until the external control
is verified.

The Notion readiness-roadmap checker matched the Engineering Roadmap and the
Production Readiness Reviews database. The database still contains only its
protected template row, and the live roadmap phase status and core work list
remain unchanged (`Planned`), so no Notion row or roadmap append was made for
this documentation-only external setup slice.

### Scope and endpoint inventory

The public flows requiring protection are:

- signup, OTP verification, and OTP resend (`signupFn`, `verifyOtpFn`, and
  `resendOtpFn`);
- password-reset request, token validation, and password update
  (`requestPasswordResetFn`, `validateResetTokenFn`, and `resetPasswordFn`);
- invitation-token lookup and invitation-email checks
  (`getInvitationByToken` and `checkInvitationByEmail`);
- email-change verification (`verifyEmailChangeFn`); and
- future enrollment opening (`createEnrollment`), which is currently blocked by
  `ENROLLMENT_OPEN = false`.

These names are application actions, not guaranteed URI paths. Before creating
a rule, use Cloudflare Security Analytics to identify the real request path and
method for each browser action. Confirm the match with the existing redacted
`serverFn:*` structured event, and do not create a broad rule for the whole
Worker merely because several handlers share TanStack server-function
transport.

### Cloudflare dashboard procedure

For the `christ-dina.org` zone:

1. Open **Cloudflare dashboard → Security → WAF → Security rules → Create rule
   → Rate limiting rules**. Cloudflare’s current dashboard procedure and field
   definitions are documented in the [zone dashboard rate-limiting
   guide](https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/).
2. Start with a narrow expression for the measured public request path and
   method. Exclude `/healthz` and `/readyz` explicitly so availability and
   readiness monitors are never counted or blocked by an abuse rule.
3. Select the client IP as the initial characteristic for unauthenticated
   public traffic. Do not key an authenticated policy only by IP: shared NAT
   addresses can make unrelated users collide. If a public flow needs a
   different identity key, document the field and privacy impact before using
   it.
4. Set the period and requests-per-period from observed normal traffic plus the
   approved synthetic rehearsal. Do not copy a threshold from this handoff or
   enable enforcement before the false-positive review.
5. Deploy the first version with **Log** action. Review matched requests,
   excluded health checks, response codes, and whether the rule distinguishes
   the intended public action from authenticated traffic.
6. After the review, change the rule to **Block** or **Managed Challenge** as
   appropriate. Where the Cloudflare plan supports a custom response, return a
   generic `429 Too Many Requests` body with no account, email, token, or
   provider detail. Cloudflare documents staged Log-first rollout and rule
   parameters in its [rate-limiting best-practices
   guide](https://developers.cloudflare.com/waf/rate-limiting-rules/best-practices/).

Keep the public-flow rules separate from any future authenticated traffic
policy. If Security Analytics shows that TanStack transport exposes only one
shared path for all handlers, stop before using a broad edge rule and record an
application-level action-key design as follow-up work.

### Better Stack signal and evidence

After the existing Cloudflare-to-Better-Stack log destination is operational:

1. Create or update a Better Stack dashboard panel for rate-limit matches,
   blocked/challenged requests, and HTTP 429 responses, preserving the existing
   redaction policy.
2. Add an alert for a sustained rate-limit or 429 spike with the owner,
   dashboard link, first action, and rollback link required by the observability
   runbook. Do not alert on a single synthetic request.
3. Record the Cloudflare rule ID, expression, method, characteristic, period,
   threshold, action, health exclusions, Better Stack query/alert URL, operator,
   and review date in the Notion Security/Risk record. Record only redacted
   request IDs and timestamps as rehearsal evidence.

### Safe verification and rollback

Use a preview/staging hostname or an approved test IP first. Send a controlled,
low-volume sequence to the exact public action while the rule is in Log mode,
then repeat only the minimum requests needed after enforcement. Never run a
burst loop against production and never use applicant data.

The acceptance evidence is:

- the intended public action is logged and, after enforcement, returns the
  configured 429/block/challenge response;
- `/healthz` and `/readyz` continue to return their normal successful response;
- authenticated traffic is not unintentionally matched by a public-only rule;
- Better Stack shows the redacted rate-limit signal and the test alert routes to
  the agreed escalation target; and
- the rule can be disabled or reverted immediately, with no application deploy.

If false positives, telemetry gaps, or health-check matches appear, disable the
new rule, keep the evidence, and return to Log mode after correcting the
expression or threshold. Keep the rule ID and rollback timestamp in the
operator record.

Official reference: [Cloudflare rate-limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/).

## Iteration 101 — course-detail authorization hardening

This iteration closed a Phase 5 object-level content disclosure gap:

- `getCourseService` previously loaded and returned unpublished lessons and
  media to every teacher because it used the viewer's broad staff role as the
  draft-content switch.
- The service now derives `canManage` from the persisted role and assigned
  course teachers, then filters both lessons and media to published rows for
  non-managing teachers. Admins and assigned course teachers retain the
  authoring view.
- Added an integration regression covering an outsider teacher and both
  unpublished lessons and media; the existing assigned-teacher and student
  behavior remains covered.

Validation: the focused course integration suite passed all 51 tests. Run the
full quality gate, integration suite, formatting, and production build before
the final handoff.

## Iteration 102 — profile role mutation defense-in-depth

This iteration closed a small Phase 5 RBAC/RLS gap in the `profiles` table:

- Added migration `drizzle/0056_profile_role_guard.sql`, which installs a
  `BEFORE UPDATE OF role` trigger. Authenticated Supabase requests may change a
  profile role only when their JWT subject is a persisted Admin; anonymous or
  other request roles are rejected.
- Preserved trusted account-provisioning paths: the direct server database
  connection (which has no PostgREST request settings) and Supabase
  `service_role` requests remain allowed. No role field was added to the
  self-service profile update contract.
- Added PGlite integration coverage for student denial and Admin,
  service-role, and trusted-server success paths. Updated the security plan and
  threat model with the new control and hosted verification requirement.

Validation: the migration chain and focused profile-role integration test must
pass locally, followed by the normal quality gate and production build. Before
production rollout, apply the versioned migration through the protected
Supabase delivery path, verify direct `authenticated` student/admin JWT
behavior with synthetic profiles, and retain only redacted evidence. If the
trigger blocks legitimate provisioning, stop the rollout and use the database
rollback/forward-fix procedure rather than editing the applied migration.
Hosted Supabase JWT-claim verification, the first restore/rollback rehearsal,
and Better Stack/Cloudflare acceptance remain external follow-up work.

## Iteration 103 — request-identity-aware RLS migration plan

This iteration completed the next repository-owned Phase 5 security unit:

- Added [`docs/plan/RLS_REQUEST_IDENTITY.md`](docs/plan/RLS_REQUEST_IDENTITY.md),
  documenting why the current Hyperdrive/Drizzle connection cannot be assumed
  to carry Supabase `auth.uid()` claims, the invariants for transaction-local
  identity propagation, the policy-family matrix, and the hosted evidence gate.
- Defined the stop conditions that prevent enabling legacy RLS policies before
  verifying JWT subject propagation, pooled-connection isolation, role
  attributes, and trusted provisioning behavior.
- Linked the plan from the Security Baseline and Threat Model priority list.
  The first candidate is the profile/role boundary; course, assignment,
  enrollment, community, and other legacy policy families remain evidence-gated.

This is intentionally a documentation-only security slice. It does not change
hosted policies, database roles, connection behavior, or application
authorization. Operator follow-up is to run the read-only Supabase inventory
and synthetic JWT checks in a non-production branch, then record redacted
evidence in the Notion Security/Risk and Engineering Roadmap records.

## Iteration 105 — nested shadcn undici remediation

This iteration completed the next bounded Phase 5 dependency-security unit:

- Refreshed the lockfile-only compatible shadcn dependency branch from
  `undici@7.28.0` to patched `undici@7.29.0`, removing the high-severity
  private-cache-directive advisory.
- Preserved jsdom's separate `undici@8.10.2` branch and the Cloudflare
  Miniflare `undici@7.29.0` branch; no incompatible root override or patch file
  was introduced.
- The high-severity audit baseline decreased from four findings across three
  packages to three findings across the remaining path-to-regexp and picomatch
  branches. Those residual findings remain report-only pending compatible
  upstream or nested-resolution options.

Validation for this iteration: lockfile-only install, frozen install, targeted
dependency-tree inspection, post-change `bun audit --audit-level=high --json`,
the quality gate with 1,953 unit tests, 408 integration tests, formatting,
typecheck, `git diff --check`, and production build.

## Iteration 107 — remove unused shadcn CLI and clear high-severity audit baseline

This iteration completed the next bounded Phase 5 dependency-security unit:

- Removed the unused local `shadcn` CLI dependency. The repository keeps its
  generated UI sources and `components.json`; future component generation is an
  explicit ephemeral `bunx --bun shadcn@latest` action.
- Added a compatible root `picomatch: ^4.0.7` override, moving all Vite/TanStack
  4.x branches beyond the affected `<4.0.4` range while preserving Wrangler's
  separate `path-to-regexp` 6.x branch.
- The post-change `bun audit --audit-level=high --json` report contains no high
  or critical advisories. Bun may still return non-zero for lower-severity
  findings, so the CI workflow parses the report and blocks only high/critical
  results; lower-severity tooling findings remain visible for routine review.
- Enabled the same high/critical threshold as a blocking condition in
  `.github/workflows/dependency-security.yml`; the JSON audit artifact remains
  uploaded on failures for investigation.

## Iteration 108 — srvx moderate advisory remediation

This iteration completed the next bounded Phase 5 dependency-security unit:

- Added a compatible root Bun/npm override for `srvx` at `^0.11.13`. The
  TanStack Start plugin's `^0.11.9` range and H3's `^0.11.13` range both accept
  the patched lockfile resolution, currently `srvx@0.11.22`.
- This removes the moderate absolute-URI middleware-bypass advisory
  [GHSA-p36q-q72m-gchr](https://github.com/advisories/GHSA-p36q-q72m-gchr)
  from the development-tool dependency tree without changing deployed
  Worker/browser behavior.
- The post-change audit report contains only the low `@babel/core` advisory and
  moderate `@humanfs/node`/`esbuild` development-tool findings. No high or
  critical advisories are present, so the existing CI blocking threshold remains
  green while lower-severity findings stay visible for routine review.

Validation: `bun install`, dependency-tree inspection, and `git diff --check`
passed. The post-change `bun audit --json` report was generated and inspected;
it exits non-zero only for the three below-threshold findings listed above, with
zero high or critical advisories. Full quality, integration, and
production-build validation remains required before final handoff.

## Iteration 109 — humanfs moderate advisory remediation

This iteration completed the next bounded Phase 5 dependency-security unit:

- Added the compatible root Bun/npm override `@humanfs/node: ^0.16.8` for
  ESLint's existing `^0.16.6` dependency range. The lockfile now resolves
  `@humanfs/node@0.16.8` and its compatible `@humanfs/core@0.19.2` branch.
- This removes the recursive-copy symlink traversal advisory
  [GHSA-p498-v437-472g](https://github.com/advisories/GHSA-p498-v437-472g)
  from the development-tool dependency tree without changing deployed
  Worker/browser behavior.
- The post-change audit report contains only the low `@babel/core` advisory and
  moderate `esbuild` development-tool advisory. No high or critical advisories
  are present, so the existing CI blocking threshold remains green while those
  lower-severity findings stay visible for routine review.

Validation: `bun install`, dependency-tree inspection, and post-change
`bun audit --json` passed with the expected below-threshold findings. Full
quality, integration, and production-build validation remains required before
final handoff.

## Iteration 111 — assignment due-date query index

This iteration added the next bounded Phase 4 performance slice:

- Created migration `drizzle/0057_assignments_status_due_date_idx.sql` with
  `assignments_status_due_date_idx` for published assignments ordered by due
  date.
- Updated the performance and database documentation and synchronized the
  corresponding Notion Data Management, Architecture Inventory, and Roadmap
  records.

Validation: quality gate, 1,953 unit tests, 409 integration tests, production
build, formatting, and type checks passed. Hosted EXPLAIN timing remains
pending representative production data.

## Iteration 112 — course-catalog authorization hardening

This iteration closed a Phase 5 draft-content disclosure gap:

- Unpublished lessons and media in course catalog/detail reads are now visible
  to admins and assigned course teachers, while other teachers receive only
  published content.
- Added regression coverage and updated security, threat-model, utility, and
  GNHF documentation. Notion Architecture Inventory and Roadmap records were
  synchronized; Service Catalog and Production Readiness remained unchanged.

Validation: focused course tests, 409 integration tests, quality gate with
1,953 unit tests, formatting, type checks, and production build passed.

## Iteration 113 — media-thumbnail completion telemetry

This iteration completed the next bounded Phase 1/observability unit:

- `uploadMediaThumbnailService` now emits `media_thumbnail_uploaded` after the
  thumbnail path is persisted, any replaced object is removed, and the signed
  result is produced.
- Unexpected persistence, cleanup, or signing failures emit
  `media_thumbnail_upload_failed` with the stable
  `media_thumbnail_persistence` category before the original error is
  rethrown. Validation and authorization behavior are unchanged.
- Telemetry contains request correlation, actor/media IDs, replacement and
  signing outcomes, status, and duration; raw thumbnail paths and provider
  error text are excluded. This is ready for the existing Better Stack/Sentry
  transport during the staged provider cutover.
- Added integration coverage for success telemetry and failure redaction, and
  updated the structured-logging and utility documentation.

Validation for this iteration: focused library integration passed all 22 tests.
Run the full quality gate, integration suite, formatting, and production build
before final handoff. Better Stack account-specific DSN, source-map, Cloudflare
destination, dashboard, and alert verification remains external follow-up;
the current browser profile is not authenticated to the Better Stack console.

## Iteration 115 — student-directory telemetry

This iteration completed the next bounded Phase 1 structured-logging slice:

- Student-directory list and detail reads now emit redacted
  `student_directory_loaded` / `student_directory_load_failed` events with
  request correlation, actor and target IDs where applicable, safe result
  counts, duration, and a stable persistence category.
- Names, emails, bios, assignment content, and other student payload fields
  remain excluded from Better Stack/Cloudflare telemetry. Existing persisted
  teacher/Admin authorization and response shapes are unchanged.
- Repository evidence: `src/utils/student/service/student.service.ts`,
  `src/utils/student/student.integration.test.ts`,
  `docs/plan/STRUCTURED_LOGGING.md`, and `src/utils/README.md`.
- Focused student integration coverage passes (11 tests), and the full
  integration suite passes 413 tests; hosted Better Stack/Cloudflare ingestion,
  dashboards, alerts, Uptime, and source-map verification remain external
  follow-up.

## Iteration 116 — teacher-directory telemetry

This iteration completed the next bounded Phase 1 structured-logging slice:

- Teacher-directory list reads now emit redacted
  `teacher_directory_loaded` / `teacher_directory_load_failed` events with
  request correlation, actor ID, safe result counts, duration, and the stable
  `teacher_directory_read_persistence` failure category.
- The full teacher payload is not logged: names, email addresses, bios,
  avatar data, course details, and Admin privilege details remain excluded.
  Existing response shapes, role checks, and authorization behavior are
  unchanged.
- Repository evidence: `src/utils/teachers/service/teachers.service.ts`,
  `src/utils/teachers/teachers.integration.test.ts`,
  `docs/plan/STRUCTURED_LOGGING.md`, and `src/utils/README.md`.

Focused teacher integration coverage passes (12 tests). Hosted Better Stack /
Cloudflare ingestion, dashboards, alerts, Uptime, and source-map verification
remain external follow-up.

## Iteration 117 — course-read telemetry

This iteration completed the next bounded Phase 1 structured-logging slice:

- Course list and detail reads now emit redacted `course_read_loaded` and
  `course_read_failed` events with request correlation, actor/course IDs,
  role, safe course/lesson/media counts, status, and duration.
- Course titles, lesson content, media metadata, teacher payloads, and storage
  URLs remain excluded. Expected authorization and not-found outcomes do not
  create noisy failure logs; unexpected repository errors retain stable
  `course_read_persistence` categorization while the original error is
  re-thrown.
- Repository evidence: `src/utils/courses/service/course.service.ts`,
  `src/utils/courses/courses.integration.test.ts`,
  `docs/plan/STRUCTURED_LOGGING.md`, and `src/utils/README.md`.

Focused course integration coverage passes (55 tests). Hosted Better Stack /
Cloudflare ingestion, dashboards, alerts, Uptime, and source-map verification
remain external follow-up.

## Iteration 118 — assignment-read telemetry

This iteration completed the next bounded Phase 1 structured-logging slice:

- Assignment lesson/detail, student/teacher list, submission-count, and
  submission-list reads now emit redacted `assignment_read_loaded` /
  `assignment_read_failed` events with request correlation, actor IDs, safe
  lesson/assignment IDs, role/scope, publication/status metadata, and result
  counts.
- Assignment titles, lesson content, student identity, submission text,
  grades, feedback, and raw persistence details remain excluded. Expected
  authorization and not-found outcomes do not create noisy failure logs;
  unexpected repository errors use the stable
  `assignment_read_persistence` category and preserve the original error.
- Repository evidence: `src/utils/assignments/service/assignments.service.ts`,
  `src/utils/assignments/assignments.integration.test.ts`,
  `docs/plan/STRUCTURED_LOGGING.md`, and `src/utils/README.md`.

Focused assignment integration coverage passes (46 tests). Hosted Better Stack /
Cloudflare ingestion, dashboards, alerts, Uptime, and source-map verification
remain external follow-up.

## Iteration 119 — library-read telemetry

This iteration completed the next bounded Phase 1 structured-logging slice:

- Library media list and detail reads now emit redacted
  `library_media_loaded` / `library_media_load_failed` events with request
  correlation, actor/media IDs, role, safe result counts, publication and
  permission flags, file type, status, and duration.
- Media titles, descriptions, external URLs, private storage paths, and raw
  persistence details remain excluded. Expected authorization and not-found
  outcomes remain quiet; unexpected read failures use the stable
  `library_media_read_persistence` category and preserve the original error.
- Added integration coverage for list/detail event shapes and storage-signing
  failure redaction. Hosted Better Stack/Cloudflare ingestion, dashboards,
  alerts, Uptime monitors, and source-map verification remain external setup.
- Validation: focused library integration passed 24 tests; full integration
  passed 427 tests, `bun run quality:gate` passed with 1,953 unit tests, and
  the production build passed with only pre-existing warnings.
