# src/utils

## Purpose

Server-side utilities and server functions used by routes and components.

This folder is primarily where TanStack Start server functions live (via `createServerFn`), along with shared helpers (auth, Supabase client creation, SEO).

## What Lives Here

- **Authorization module** (`authz/`)
  - Deep authorization module with fluent interface and per-request caching.
  - `types.ts`: AuthorizationService interface, Action/ResourceType types.
  - `default-adapter.ts`: Default implementation using Supabase + Drizzle.
  - `builder.ts`: Fluent builder for `authz(userId).perform(action).on(resource)`.
  - `cache.ts`: Per-request caching using AsyncLocalStorage.
  - `route.ts`: Route protection with redirect support.
  - `test-adapter.ts`: Test adapter for unit testing authorization logic.
  - `permissions.ts`: UI permission calculation utility for entity-level permissions.
    - `calculateEntityPermissions(role, entity, userId)`: Returns `{ isAdmin, isCourseTeacher, canEdit, canManage }`
    - Used by server functions to return permissions to frontend, eliminating client-side permission logic duplication.
  - Usage: `authz(userId).perform('gradeAssignment').on(assignmentId)` (throws if not allowed)
  - Usage: `isAllowed(userId).perform('gradeAssignment').on(assignmentId)` (returns boolean)

- **Unified request scope**
  - `request-scope.ts`: composes re-entrant authz cache maps with `withDbConnection`.
  - `request-scope-middleware.ts`: enters that scope for every TanStack Start request
    and server function.
  - CSRF runs first on Start `requestMiddleware` in `src/start.tsx` and only
    checks `handlerType === 'serverFn'`. Request scope is not entered for a
    rejected cross-site server-function call.

- **Auth utilities**
  - `auth.ts`: current user lookup and role/access helpers (legacy, migrate to authz).
  - `auth/login.ts`: Supabase password sign-in adapter with redacted,
    request-correlated `login_succeeded` / `login_failed` telemetry.
  - `auth/logout.ts`: Supabase sign-out adapter with redacted,
    request-correlated `logout_succeeded` / `logout_failed` telemetry.

- **Error utilities**
  - `errors.ts`: typed `AppError` hierarchy for expected server-function failures.
  - Exports `AuthenticationError`, `AuthorizationError`, `ValidationError`, `NotFoundError`, `ConflictError`, `toUserError()`, and `logServerError()`.
  - Server functions should throw typed errors for expected failures and translate them at UI boundaries with `toUserError()`.

- **Health utilities**
  - `health/`: Worker-level `/healthz` and `/readyz` response helpers.
  - `/healthz` confirms the Worker/app process is alive without dependency checks.
  - `/readyz` checks database connectivity through `getDb()` and `withDbConnection()`.
  - Dependency checks fail closed after a short timeout (default 2s) so hung Hyperdrive/pg does not hang the probe.
  - Responses and logs use redacted, structured operational fields only.

- **Observability identity**
  - `observability/domain/identity.domain.ts`: maps build modes and optional
    deployment settings to the canonical `local`, `preview`, and `production`
    environments and normalizes release identifiers for error tracking.
  - `observability/logger.ts`: emits JSON server events at `info`, `warn`, or
    `error` level and recursively redacts sensitive fields before writing to
    the Worker console.
  - Enrollment evaluation mutations emit redacted
    `enrollment_evaluation_updated` events with request correlation, action,
    status, duration, evaluator/enrollment IDs, and the updated field type;
    scores, admission values, and note text are not logged.
  - Admin enrollment status, special-case, and deletion mutations emit
    redacted `enrollment_status_updated`,
    `enrollment_special_case_updated`, and `enrollment_deleted` events with
    request correlation, actor/enrollment IDs, safe outcome metadata, and
    duration; unexpected persistence failures use stable categories without
    enrollment content or raw database details.
  - Avatar and course-thumbnail upload actions emit request-correlated
    `image_upload_completed` / `image_upload_failed` events; signed-URL and
    old-object cleanup failures use stable warning categories without storage
    paths or provider messages.
  - Student exam submission emits redacted
    `exam_attempt_submitted` / `exam_attempt_submission_ignored` events with
    request correlation, attempt/exam/student IDs, status, duration, and
    submission mode; unexpected finalization failures use a stable category.
  - Student attendance check-in emits redacted
    `attendance_check_in_completed` / `attendance_check_in_ignored` events
    with request correlation, course/session/lesson/student IDs, status, and
    duration; unexpected persistence failures use a stable category.
  - Profile updates and email-change verification emit redacted
    `profile_updated`, `email_change_requested`, `email_change_completed`, and
    failure events with request correlation, user ID, status, duration, and
    stable persistence/provider categories; email addresses, verification
    tokens, and provider messages are excluded. Authenticated password changes
    emit `password_updated` / `password_update_failed` with the same safe
    fields and stable `password_update` category; password values and provider
    messages are excluded.
  - Public enrollment persistence emits redacted `enrollment_created` /
    `enrollment_create_failed` events with request correlation,
    `serverFn:createEnrollment`, a stable public-form source, status, duration,
    and the generated enrollment ID only on success; applicant identity,
    contact details, application responses, and raw persistence errors are
    excluded.
  - Manual Admin enrollment invitation sends emit redacted
    `enrollment_invitation_sent` / `enrollment_invitation_failed` events with
    request correlation, `serverFn:sendInvitationForEnrollment`, actor/
    enrollment/invitation IDs where available, new-versus-resend mode, status,
    duration, and stable delivery/persistence categories; recipient emails,
    invitation tokens, provider errors, and expected user-facing outcomes are
    excluded.
  - Admin staff-privilege grants and revokes emit redacted
    `staff_privilege_updated` audit events with request correlation, actor and
    target IDs, privilege, grant direction, status, and duration; persistence
    failures use a stable category without raw provider details.
  - Admin invitation creation and resend emit redacted
    `invitation_created` / `invitation_resent` events and stable delivery or
    persistence failures; revoke and delete emit audit events. Actor and
    invitation IDs plus role are safe fields, while email addresses, tokens,
    and provider messages are excluded.
  - Course-teacher lesson authoring emits redacted `lesson_created`,
    `lesson_updated`, and `lesson_deleted` events with request correlation,
    actor/course/lesson IDs, status, and duration; persistence failures use
    the stable `lesson_persistence` category.
  - Student lesson completion is persisted through the `completeLesson` server
    function only for published lessons. Completion uses an idempotent
    `(studentId, lessonId)` upsert and emits redacted `lesson_completed`,
    `lesson_completion_ignored`, or `lesson_completion_failed` events without
    lesson content. The response includes a transition-only `courseCompleted`
    flag when the request completes every published lesson in the course.
  - Calendar overview reads emit redacted `calendar_events_loaded` events with
    request correlation, actor ID, source counts, total event count, status,
    and duration. Unexpected read failures use the stable
    `calendar_read_persistence` category without calendar content or links.
  - Student-directory list and detail reads emit redacted
    `student_directory_loaded` / `student_directory_load_failed` events with
    request correlation, actor and target IDs where applicable, safe result
    counts, duration, and the stable `student_directory_read_persistence`
    failure category; names, emails, bios, and assignment content remain
    excluded.
  - Teacher-directory list reads emit redacted `teacher_directory_loaded` /
    `teacher_directory_load_failed` events with request correlation, actor ID,
    safe result counts, duration, and the stable
    `teacher_directory_read_persistence` failure category; teacher names,
    emails, bios, and privilege details remain excluded.
  - Assignment lesson/detail, student/teacher list, submission-count, and
    submission-list reads emit redacted `assignment_read_loaded` /
    `assignment_read_failed` events with request correlation, actor IDs, safe
    lesson/assignment IDs, role/scope, publication/status metadata, and result
    counts. Assignment titles, lesson content, student identity, submission
    text, grades, feedback, and raw persistence details remain excluded;
    unexpected failures use `assignment_read_persistence` while expected
    authorization and not-found outcomes remain quiet.
  - Library media list/detail reads emit redacted
    `library_media_loaded` / `library_media_load_failed` events with request
    correlation, actor/media IDs, role, safe result counts, publication and
    permission flags, file type, status, and duration. Titles, descriptions,
    external URLs, private storage paths, and raw persistence details remain
    excluded; unexpected failures use `library_media_read_persistence` while
    expected authorization and not-found outcomes remain quiet.
  - Assignment authoring emits redacted `assignment_created`,
    `assignment_updated`, and `assignment_deleted` events with request
    correlation, server-function path, actor/course/lesson/assignment IDs,
    safe assignment status, and duration; titles, descriptions, due dates,
    and raw persistence details remain excluded, with failures categorized as
    `assignment_persistence`.
  - Enrollment distribution and teacher substitution mutations emit redacted
    `enrollment_distribution_completed`,
    `enrollment_substitution_completed`, and
    `enrollment_substitution_ended` events with request correlation, actor and
    safe teacher/course identifiers, outcome counters, and duration;
    unexpected persistence failures use stable categories without applicant
    content or raw database details.
  - Bulk enrollment grading emits redacted
    `enrollment_bulk_grade_completed` events for preview and execute paths with
    request correlation, actor ID, thresholds, safe outcome counters, and
    duration; read and update failures use stable persistence categories without
    enrollment identifiers or raw database details.
  - Course create, update, and delete mutations emit redacted
    `course_created`, `course_updated`, and `course_deleted` events with
    request correlation, actor/course IDs, status, duration, and publication
    state where relevant; unexpected persistence failures use the stable
    `course_persistence` category while expected conflicts and validation
    outcomes remain outside noisy error logs.
  - Course list and detail reads emit redacted `course_read_loaded` and
    `course_read_failed` events with request correlation, actor/course IDs,
    role, safe lesson/media/course counts, status, and duration; expected
    authorization and not-found outcomes remain outside noisy error logs, and
    course content is excluded.
  - Direct Admin course-teacher assignment emits redacted
    `course_teachers_updated` telemetry with request correlation,
    actor/course/teacher IDs, status, and duration; unexpected replacement
    failures use `course_teacher_assignment_persistence` without raw database
    details.
  - Post and comment create, update, and delete mutations emit redacted
    `post_*` / `comment_*` events with request correlation, actor/post/comment/
    course IDs, status, and duration; content and raw persistence details are
    excluded.
  - Post and comment reaction toggles emit redacted
    `post_reaction_toggled` / `comment_reaction_toggled` events with request
    correlation, actor/target IDs, action, emoji, status, and duration;
    unexpected persistence failures use stable reaction categories.
  - Post-notification group and mark-all read-state mutations emit redacted
    `notification_group_marked_read` / `notifications_marked_read` events with
    request correlation, actor/target metadata, read scope, status, and
    duration; unexpected persistence failures use the stable
    `notification_read_state_persistence` category.
  - Admin Zoom-link create, update, and delete mutations emit redacted
    `zoom_link_created`, `zoom_link_updated`, and `zoom_link_deleted` events
    with request correlation, actor/link IDs, ownership section, status, and
    duration; credentials, meeting IDs, URLs, titles, and raw persistence
    details remain excluded.
  - Media-library create, update, and delete mutations emit redacted
    `media_created`, `media_updated`, and `media_deleted` events with request
    correlation, actor/media IDs, media kind, course ID where applicable,
    status, and duration; titles, descriptions, URLs, private storage paths,
    and raw persistence details remain excluded.
  - Media-thumbnail completion emits redacted
    `media_thumbnail_uploaded` / `media_thumbnail_upload_failed` events with
    request correlation, actor/media IDs, replacement/signing outcomes, status,
    duration, and a stable persistence category; thumbnail paths and provider
    error text remain excluded.
  - Student exam-taking start/resume and answer-save mutations emit redacted
    `exam_attempt_started`, `exam_attempt_resumed`, and `exam_answer_saved`
    events with request correlation, student/attempt/exam IDs, attempt or
    question status, question type, and duration. Selected option IDs, answer
    text, and raw persistence details remain excluded; unexpected failures use
    stable `exam_attempt_persistence` or `exam_answer_persistence` categories.
  - Teacher exam grading emits redacted `exam_open_answer_graded` and
    `exam_grading_finalized` events with request correlation,
    grader/attempt/exam/question metadata, status, and duration. Awarded
    points, aggregate scores, answer text, and raw persistence details remain
    excluded; unexpected failures use `exam_grading_persistence`.
  - `observability/request-context.ts`: keeps the Cloudflare/request
    correlation ID available through nested request and server-function work;
    it prefers `cf-ray`/`x-request-id` and generates a UUID when neither is
    present.
  - `observability/trace-context.ts`: adds active OpenTelemetry `trace_id` and
    `span_id` values to Sentry-compatible error events so Better Stack Errors
    can link them to Cloudflare Logs & Traces when a span is available.

- **Product analytics**
  - `analytics.ts`: optional browser-only PostHog boundary with an allow-listed
    LMS event-name union, stable user-ID/role identification, logout reset, and
    disabled autocapture/session recording by default. It exposes privacy-safe
    helpers for student activation, lesson completion, and course completion;
    student activation is deduplicated per user in browser storage, and no
    event leaves the browser until `VITE_POSTHOG_KEY` is configured.

- **Supabase utilities**
  - `supabase.ts`: server client (`@supabase/ssr`) and admin client.

- **Feature server function modules**
  - `courses/` - Course management split by aggregate:
    - `course.ts` - Course CRUD, publishing, teacher assignment orchestration
    - `lesson.ts` - Lesson CRUD, scheduling, ordering, calendar queries
  - `teacher-assignment.ts` - Teacher-course relationship management (2-teacher invariant)
    - `index.ts` - Re-exports all functions for backward compatibility
  - `assignments.ts`, `students.ts`, `teachers.ts`, `calendar.ts`, `events.ts`, `invitations.ts`, `enrollments.ts`, `posts.ts`, `library.ts`.
  - `library.ts` - Authenticated media-library reads and mutations. The service
    derives the viewer role from the persisted profile; adapters pass only the
    authenticated actor ID, and private upload paths remain actor-owned.
  - `teachers.ts` - Authenticated teacher directory reads; the service requires
    a persisted profile and carries the actor through internal callers.
  - `posts.ts` - Authenticated community post/channel/comment reads and
    mutations; the service boundary requires a persisted profile and carries
    the actor through every read/write call.
  - `postNotifications.ts` - Authenticated notification summary and
    mark-read operations; the service boundary requires a persisted profile
    before notification reads or read-state updates.
  - Lesson detail reads require a persisted profile and expose unpublished
    lessons/draft assignments only to course teachers or admins; non-managers
    receive published lesson/assignment data only.
  - Course detail reads expose unpublished lessons and media only to the
    assigned course teachers or admins; other teachers receive published
    course content only.
  - Course catalog reads expose unpublished lessons only to the assigned
    course teachers or admins; other teachers receive published lessons only.
  - Calendar event listing and mutations use `event/service/event.service.ts`
    for the shared database adapter, teacher/Admin service boundary, and
    redacted `calendar_event_*` operational events.
  - `attendance/` — live Attendance Session open/close, student self check-in (`markPresent`), and Course Teacher/Admin/privileged-teacher override (`setStudentPresent`) from student detail. Session and override mutations emit redacted request-correlated Better Stack-ready telemetry with stable persistence categories.
  - `staff-privilege/` — Staff Privilege grants (ADR 0023): domain live-check, Admin grant/revoke, `hasStaffPrivilege` used by attendance override and enrolment contact export.
  - `exam/` — Timed exam authoring, attempt lifecycle, autosave, lazy finalization, and grading (ADR 0017). Student listing/taking services require the caller's persisted `student` role; teacher/Admin services use the staff boundary.
  - These typically export server functions that routes call for loading and mutations.
  - Server functions are thin adapters that validate input, call domain services from `src/domain/`, and return responses.
  - `postNotifications.ts`.
    - Post notification inbox logic (aggregation + mark read).
  - `zoomLink/` - Zoom credential management:
    - Domain filtering ensures Students receive General links plus only their assigned Teacher-user's links before a loader payload is built.
    - Service owner validation permits only Teacher-user or Admin profiles; Admin-only mutations remain enforced through `authz`.
    - Admin payloads include Teachers-page-ordered owner options for editing; other roles do not receive them.
  - `notifications/` - Notification event system:
    - `types.ts` - Core types (NotificationEvent, DeliveryAdapter, Handler)
    - `events.ts` - Event factories (createPostCreatedEvent, createCommentCreatedEvent)
    - `recipients.ts` - Business rules for recipient calculation
    - `delivery.ts` - Delivery adapters (DatabaseDeliveryAdapter for DB writes); failed
      persistence is best-effort and emits redacted `notification_delivery_failed` telemetry
    - `index.ts` - Main exports: emit(event) for sending notifications
    - Usage: `await emit(createPostCreatedEvent(actorId, postId, courseId, canModerate))`
  - `email/` - Shared outbound email utilities:
    - `types.ts`: `EmailSender` port and typed transactional email message shapes.
    - `sender/resend-email-sender.ts`: Resend adapter, template rendering, subjects, and provider error normalization.
    - `index.ts`: `getEmailSender` / `setEmailSender` seam plus shared transactional and invitation sending primitives.
    - `domain/`: pure campaign resolver and bulk invitation planner.
    - `email-campaign.ts`, `service/`, `repository/`: admin-only bulk invitation email campaign server functions, lock handling, and logging.
  - `whatsapp/`: Admin-only bulk WhatsApp campaign server functions, lock handling, delivery logging, and provider adapter.
    - Campaign lock inspection and explicit release are authorized in the service layer, so direct callers cannot bypass the Admin boundary.

- **Role-gated route helpers**
  - `admin.ts`: shared admin-only access check for routes (legacy, migrate to authz).

- **Datetime helpers** (`datetime/`)
  - Pure glue for `<input type="datetime-local">`: `toDatetimeLocalValue` / `parseDatetimeLocalValue`.
  - Always use browser-local wall-clock components (`getHours`, …). Never `toISOString().slice` for form load — that is UTC and shifts displayed times by the host offset.

- **Misc**
  - `imageUpload/` and `storage/`: private upload helpers.
    - Request server functions validate metadata and mint actor-owned signed upload URLs.
    - Avatar upload request/completion services require a persisted profile before
      using the service-role storage client or persisting an avatar path.
    - Browser bytes upload directly to Supabase Storage.
    - Completion server functions persist canonical paths and remove replaced objects.
    - Read services batch-mint one-hour signed display URLs (ADR 0022).
    - Image renderers pass signed avatar and thumbnail URLs through `useSessionPrivateImageUrl`. Its browser-only cache keys by stable signed-storage pathname, reuses the first URL across SPA navigation until near token expiry, and resets at authenticated-user changes. Public/external images and signed video/PDF URLs bypass this cache.
  - `password.ts`: password-related helpers for auth flows.
  - `seo.ts`: metadata helper.

## Key Invariants / Assumptions

- **Authorization**
  - Use `authz` module for all authorization checks (preferred over legacy `auth.ts`).
  - Per-request caching is automatic inside global Start request-scope middleware;
    handlers and services must not add manual cache wrappers.
  - Route protection: use `protectRoute({ require: 'admin' })` in route loaders.

- **Server functions and auth**
  - Server functions that require authentication should call `getCurrentUser()` from `auth.ts` (legacy).
  - New code should use `authz` module for authorization after authentication.
  - Expected failures should throw `AppError` subclasses from `errors.ts`.
  - Do not return `{ error: true, message }` from new server functions.

- **DB access**
  - Use `getDb()` from `src/db/index.ts`.
  - Do not create Drizzle instances in random locations.

- **Env/keys**
  - Use `src/env.ts` and `getSupabaseServerClient()` / `getSupabaseAdminClient()`.
  - Never expose the service role key to the client.

## Common Change Recipes

- **Add a new server function for a feature**
  - Prefer adding it to the closest feature module in this directory.
  - Validate inputs using schemas from `src/schemas/*`.
  - Use `authz` module for authorization: `await authz(userId).perform('editCourse').on(courseId)`.
  - Throw typed errors such as `new NotFoundError('Course not found')` or `new AuthorizationError('Teacher access required')`.
  - Let route/client code translate display text with `toUserError(error).message`.

- **Change auth rules / roles**
  - Update `authz/default-adapter.ts` for authorization logic.
  - Update `auth.ts` only for legacy auth (migration in progress).
  - If route protection assumptions change, update `src/routes/README.md`.

- **Add new authorization action**
  - Add action to `Action` type in `authz/types.ts`.
  - Implement logic in `DefaultAuthorizationService.canPerformAction()`.

## Related Docs

- `docs/ENGINEERING_GUIDE.md`
- `src/routes/README.md`
- `src/db/README.md`
