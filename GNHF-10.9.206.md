# GNHF-10.9.206 — Engineering roadmap implementation handoff

**Date:** 2026-09-11
**Iteration:** 52
**Scope:** complete the privacy-safe PostHog enrollment funnel entry event.

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
| Error tracking        | Sentry-compatible SDK wiring now emits explicit environment/release identity; Better Stack provider cutover is pending                                                                   | Create Better Stack DSN, configure deployment secrets, and verify ingestion/source maps      |
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
