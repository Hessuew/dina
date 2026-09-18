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
  - Unexpected role and resource persistence failures emit one redacted
    `authorization_lookup_failed` event with request correlation, safe IDs,
    action metadata, and stable lookup categories; expected denials remain
    ordinary authorization outcomes. Staff-privilege reads use the same event
    with the stable `authorization_staff_privilege_read_persistence` category;
    raw persistence details remain excluded.

- **Unified request scope**
  - `request-scope.ts`: composes re-entrant authz cache maps with `withDbConnection`.
  - `request-scope-middleware.ts`: enters that scope for every TanStack Start request
    and server function.
  - CSRF runs first on Start `requestMiddleware` in `src/start.tsx` and only
    checks `handlerType === 'serverFn'`. Request scope is not entered for a
    rejected cross-site server-function call.

- **Auth utilities**
  - `auth.ts`: current user lookup and role/access helpers (legacy, migrate to authz).
    Unexpected Supabase session and persisted-profile lookup failures emit
    redacted `auth_session_lookup_failed` / `auth_profile_lookup_failed`
    telemetry with request correlation, duration, safe identity where
    available, and stable error categories; expected unauthenticated and
    missing-profile results remain ordinary auth outcomes. The root route's
    `getRootUserContext` bootstrap uses the same redacted events for its
    session/profile persistence failures.
  - `auth/login.ts`: Supabase password sign-in adapter with redacted,
    request-correlated `login_succeeded` / `login_failed` telemetry, including
    stable error-level logging for unexpected provider exceptions.
  - `auth/logout.ts`: Supabase sign-out adapter with redacted,
    request-correlated `logout_succeeded` / `logout_failed` telemetry.
  - Signup and OTP verification emit redacted delivery, provisioning, rollback,
    auto-login, resend, and persistence-failure events. Invitation/profile
    lookup, OTP update/attempt, invitation acceptance, and verified-OTP cleanup
    failures carry request correlation, safe invitation IDs where applicable,
    stable persistence categories, and preserve the original error; tokens,
    email addresses, passwords, provider messages, and raw database details
    remain excluded.

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
  - Shared auth boundaries emit redacted session/profile lookup failure events
    with request correlation, duration, and stable categories; provider,
    database, and exception details remain outside telemetry.
  - Enrollment evaluation mutations emit redacted
    `enrollment_evaluation_updated` events with request correlation, action,
    status, duration, evaluator/enrollment IDs, and the updated field type;
    scores, admission values, and note text are not logged. Unexpected
    persistence failures emit `enrollment_evaluation_update_failed` with the
    stable `enrollment_evaluation_persistence` category. Unexpected role,
    reviewer-assignment, and course-team authorization reads reuse the same
    failure event with `enrollment_evaluation_authorization_persistence`;
    expected authorization and validation outcomes remain quiet.
  - Admin enrollment status, special-case, and deletion mutations emit
    redacted `enrollment_status_updated`,
    `enrollment_special_case_updated`, and `enrollment_deleted` events with
    request correlation, actor/enrollment IDs, safe outcome metadata, and
    duration; unexpected persistence failures, including Admin-role
    authorization preflight failures, use stable categories without enrollment
    content or raw database details; expected denials remain quiet.
  - Avatar and course-thumbnail upload actions emit request-correlated
    `image_upload_completed` / `image_upload_failed` events; signed-URL and
    old-object cleanup failures use stable warning categories without storage
    paths or provider messages. Unexpected course authorization persistence
    failures use the stable `course_thumbnail_authorization_persistence`
    category; expected denials remain quiet.
  - Student exam submission emits redacted
    `exam_attempt_submitted` / `exam_attempt_submission_ignored` events with
    request correlation, attempt/exam/student IDs, status, duration, and
    submission mode; unexpected finalization failures use a stable category.
  - Student attendance check-in emits redacted
    `attendance_check_in_completed` / `attendance_check_in_ignored` events
    with request correlation, course/session/lesson/student IDs, status, and
    duration; unexpected persistence failures use a stable category.
    Unexpected profile and attendance preflight persistence failures reuse
    `attendance_check_in_failed`, `attendance_session_open_failed`,
    `attendance_session_close_failed`, or `attendance_override_failed` with
    stable categories; expected authorization, not-found, and validation
    outcomes remain quiet.
  - Course attendance state and student open-session reads are client-polled,
    so only failures emit log events: redacted `attendance_state_load_failed`
    and `attendance_open_sessions_load_failed` with request correlation,
    actor/course IDs, and duration. Attendance titles, timestamps, and raw
    persistence details remain excluded; unexpected read failures use
    `attendance_read_persistence`. Non-manager viewers only see published
    lessons and open sessions on published lessons.
  - Profile updates and email-change verification emit redacted
    `profile_updated`, `email_change_requested`, `email_change_completed`, and
    failure events with request correlation, user ID, status, duration, and
    stable persistence/provider categories; email addresses, verification
    tokens, and provider messages are excluded. Email-change request lookup,
    verification-token lookup, failed-attempt accounting, and delivery cleanup
    failures use stable persistence categories without raw repository details.
    Authenticated password changes emit `password_updated` /
    `password_update_failed` with the same safe fields and stable
    `password_update` category; password values and provider messages are
    excluded.
  - Password-reset requests and token validation emit redacted
    `password_reset_request_failed`, `password_reset_token_validated`, and
    `password_reset_token_lookup_failed` events with request correlation,
    safe user IDs when known, duration, and stable read/write persistence
    categories. Reset completion also records token lookup, attempt-accounting,
    and reset-state cleanup failures with stable persistence categories. Email
    addresses, reset tokens, passwords, and provider or database details
    remain excluded; anonymous, cooldown, invalid, and expired-token outcomes
    stay quiet.
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
    failures use stable categories, including unexpected Admin-role and
    target-profile preflight failures, without raw provider details.
  - Admin invitation creation and resend emit redacted
    `invitation_created` / `invitation_resent` events and stable delivery or
    persistence failures; revoke and delete emit audit events. Actor and
    invitation IDs plus role are safe fields, while email addresses, tokens,
    and provider messages are excluded. Unexpected create duplicate/profile
    checks, actor-profile preflights, and resend target/token-rotation failures
    reuse the corresponding redacted mutation failure events with stable read
    or persistence categories; original repository errors remain unchanged.
  - Admin invitation-list reads emit redacted `invitations_loaded` /
    `invitations_load_failed` events with request correlation, actor ID, safe
    result counts, duration, and the stable `invitation_read_persistence`
    category; invitation emails, inviter details, tokens, and raw persistence
    errors remain excluded.
  - Public invitation-token validation emits redacted
    `invitation_token_validated` / `invitation_token_lookup_failed` events
    with request correlation, invitation role/ID on success, and a stable
    persistence category on unexpected failure; tokens, email addresses, and
    raw persistence details remain excluded.
  - Public invitation-email validation emits redacted
    `invitation_email_validated` / `invitation_email_lookup_failed` events with
    request correlation, role on success, duration, and the stable
    `invitation_email_read_persistence` failure category. Email addresses and
    raw provider/database details remain excluded; missing, expired, and
    revoked invitation outcomes stay quiet.
  - Privileged enrollment contact exports emit redacted
    `enrollment_contact_exported` / `enrollment_contact_export_failed` events
    with request correlation, actor ID, cohort, safe contact count, duration,
    and the stable `enrollment_contact_export_persistence` category; email
    addresses, names, phone numbers, and raw persistence errors remain
    excluded.
  - Manual enrollment contact lookups by pasted names emit redacted
    `enrollment_contact_lookup_completed` /
    `enrollment_contact_lookup_failed` events with request correlation, actor
    ID, safe query/candidate/group/match counts, duration, and the stable
    `enrollment_contact_lookup_persistence` category. Unexpected staff-
    privilege persistence failures during export or lookup authorization use
    the stable `enrollment_contact_access_persistence` category inside the
    matching operation event; expected denials remain quiet. Names, emails,
    phone numbers, and raw persistence errors remain excluded.
  - Course-teacher lesson authoring emits redacted `lesson_created`,
    `lesson_updated`, and `lesson_deleted` events with request correlation,
    actor/course/lesson IDs, status, and duration; persistence failures use
    the stable `lesson_persistence` category. Unexpected authorization
    preflight persistence failures reuse each operation's redacted failure
    event with `lesson_authorization_persistence`; expected denials remain
    quiet.
  - Student lesson completion is derived at read time (ADR 0024): a lesson is
    complete for a student when it has at least one published assignment and
    every published assignment has a submission by that student with a non-null
    grade. There is no stored progress row and no student-facing completion
    mutation; the lesson page renders a passive status only.
  - Calendar overview reads emit redacted `calendar_events_loaded` events with
    request correlation, actor ID, source counts, total event count, status,
    and duration. Unexpected read failures use the stable
    `calendar_read_persistence` category, including actor-profile preflight
    failures, without calendar content or links; expected missing-profile
    outcomes remain quiet.
  - Student-directory list and detail reads emit redacted
    `student_directory_loaded` / `student_directory_load_failed` events with
    request correlation, actor and target IDs where applicable, safe result
    counts, duration, and the stable `student_directory_read_persistence`
    failure category, including authorization and detail preflight lookups;
    expected not-found and authorization outcomes remain quiet. Names, emails,
    bios, and assignment content remain excluded.
  - Teacher-directory list reads emit redacted `teacher_directory_loaded` /
    `teacher_directory_load_failed` events with request correlation, actor ID,
    safe result counts, duration, and the stable
    `teacher_directory_read_persistence` failure category; actor-profile and
    admin-role preflight failures remain inside the same redacted read boundary
    and expected missing-profile or authorization outcomes remain quiet, while
    teacher names, emails, bios, and privilege details remain excluded.
  - Assignment lesson/detail, student/teacher list, submission-count, and
    submission-list reads emit redacted `assignment_read_loaded` /
    `assignment_read_failed` events with request correlation, actor IDs, safe
    lesson/assignment IDs, role/scope, publication/status metadata, and result
    counts. Assignment titles, lesson content, student identity, submission
    text, grades, feedback, and raw persistence details remain excluded;
    unexpected failures use `assignment_read_persistence` while expected
    authorization and not-found outcomes remain quiet. Actor-profile failures
    in student/teacher lists remain inside this boundary; submission
    actor-profile and repository read failures use
    `submission_read_persistence`.
  - Assignment creation, update, deletion, and teacher grading authorization
    preflights reuse their redacted operation failure events with request
    correlation, safe assignment/lesson/course identifiers, duration, and
    stable authorization-persistence categories; expected denials remain quiet
    and assignment content, grades, feedback, and raw persistence details
    remain excluded.
  - Library media list/detail reads emit redacted
    `library_media_loaded` / `library_media_load_failed` events with request
    correlation, actor/media IDs, role, safe result counts, publication and
    permission flags, file type, status, and duration. Titles, descriptions,
    external URLs, private storage paths, and raw persistence details remain
    excluded; unexpected failures use `library_media_read_persistence` while
    expected authorization and not-found outcomes remain quiet.
  - Managed-media update, delete, and thumbnail-upload preflight lookups emit
    redacted `media_mutation_failed` events with the stable
    `media_read_persistence` category; expected authorization and not-found
    outcomes remain quiet. Media creation keeps its staff/profile preflight in
    the same mutation boundary and uses the stable `media_persistence`
    category for unexpected failures.
  - Media-library file and thumbnail signed-upload requests emit redacted
    `media_upload_url_issued` / `media_upload_url_issue_failed` events with
    request correlation, actor/media IDs where applicable, bucket, media kind,
    status, duration, and the stable `media_upload_request_persistence`
    failure category. Filenames, object paths, signed URLs, and raw provider
    details remain excluded; expected authorization and validation outcomes stay
    quiet.
  - Assignment authoring emits redacted `assignment_created`,
    `assignment_updated`, and `assignment_deleted` events with request
    correlation, server-function path, actor/course/lesson/assignment IDs,
    safe assignment status, and duration; titles, descriptions, due dates,
    and raw persistence details remain excluded, with failures categorized as
    `assignment_persistence`. Unexpected assignment, submission, and grading
    preflight lookup failures reuse redacted failure events with stable
    `assignment_read_persistence`, `submission_read_persistence`, and
    `assignment_grading_read_persistence` categories; expected not-found and
    validation outcomes remain quiet.
  - Enrollment distribution and teacher substitution mutations emit redacted
    `enrollment_distribution_completed`,
    `enrollment_substitution_completed`, and
    `enrollment_substitution_ended` events with request correlation, actor and
    safe teacher/course identifiers, outcome counters, and duration;
    unexpected persistence failures use stable categories without applicant
    content or raw database details. Distribution and substitution
    read-preflight failures reuse redacted `enrollment_distribution_failed` /
    `enrollment_substitution_failed` events with stable read-persistence
    categories, safe actor/teacher identifiers, and original-error
    preservation. Admin-role authorization preflight failures remain inside
    the matching operation event with stable authorization-persistence
    categories; expected denials remain quiet.
  - Bulk enrollment grading emits redacted
    `enrollment_bulk_grade_completed` events for preview and execute paths with
    request correlation, actor ID, thresholds, safe outcome counters, and
    duration; read, update, and Admin-role authorization failures use stable
    persistence categories without enrollment identifiers or raw database
    details; expected denials remain quiet.
  - Course create, update, and delete mutations emit redacted
    `course_created`, `course_updated`, and `course_deleted` events with
    request correlation, actor/course IDs, status, duration, and publication
    state where relevant; unexpected persistence failures use the stable
    `course_persistence` category, while authorization preflight failures use
    `course_authorization_persistence`; expected conflicts and validation
    outcomes remain outside noisy error logs.
  - Course list and detail reads emit redacted `course_read_loaded` and
    `course_read_failed` events with request correlation, actor/course IDs,
    role, safe lesson/media/course counts, status, and duration; expected
    authorization and not-found outcomes remain outside noisy error logs;
    actor-profile preflight failures reuse the same stable
    `course_read_persistence` category, and course content is excluded.
  - Student course-calendar reads emit redacted
    `course_calendar_events_loaded` / `course_calendar_events_load_failed`
    events with request correlation, actor ID, safe course/source/event counts,
    status, and duration; lesson and assignment content plus raw persistence
    details remain excluded, and original repository errors are preserved.
  - Dashboard upcoming-lesson reads emit redacted
    `upcoming_lessons_loaded` / `upcoming_lessons_load_failed` events with
    request correlation, actor ID, safe lesson counts, status, duration, and
    the stable `upcoming_lessons_read_persistence` failure category. Lesson
    actor-profile preflight failures remain inside the same redacted read
    boundary; lesson titles, course names, content, and thumbnail URLs remain
    outside telemetry.
  - Direct Admin course-teacher assignment emits redacted
    `course_teachers_updated` telemetry with request correlation,
    actor/course/teacher IDs, status, and duration; unexpected replacement
    failures use `course_teacher_assignment_persistence`, while Admin-role
    preflight failures use
    `course_teacher_assignment_authorization_persistence`; raw database
    details remain excluded and expected denials stay quiet.
  - Authenticated course-teacher list reads emit redacted
    `course_teachers_loaded` / `course_teachers_load_failed` events with
    request correlation, actor/course IDs, safe teacher counts, status,
    duration, and the stable `course_teacher_read_persistence` category;
    actor-profile preflight failures reuse that boundary, while teacher profile
    fields, storage URLs, and raw persistence details remain excluded.
  - The legacy `isCourseTeacherService` probe emits a redacted
    `course_teacher_check_failed` event for unexpected assignment-read
    persistence failures with request correlation, actor/course IDs, duration,
    and the stable `course_teacher_read_persistence` category; boolean
    authorization results remain unchanged.
  - Admin active-substitution lookups emit redacted
    `enrollment_substitutions_loaded` /
    `enrollment_substitutions_load_failed` events with request correlation,
    actor ID, safe substitution counts, duration, and the stable
    `enrollment_substitution_read_persistence` category; teacher IDs and raw
    persistence details remain excluded.
  - Admin email and WhatsApp campaign lock, preview, and send entrypoints emit
    redacted operation-specific authorization failures with the stable
    `campaign_authorization_persistence` category when the Admin role read
    unexpectedly fails; expected denials remain quiet. Campaign previews emit
    `email_campaign_previewed` / `whatsapp_campaign_previewed` events with
    request correlation, campaign, actor ID, safe send/skip counts, status,
    and duration. Unexpected lock or recipient-planning persistence failures
    use `email_campaign_preview_failed` /
    `whatsapp_campaign_preview_failed` and the stable
    `campaign_preview_persistence` category; expected authorization and lock
    conflicts remain quiet, and recipient/contact values remain excluded.
  - Post and comment create, update, and delete mutations emit redacted
    `post_*` / `comment_*` events with request correlation, actor/post/comment/
    course IDs, status, and duration; content and raw persistence details are
    excluded. Unexpected post/comment preflight persistence failures use stable
    `post_mutation_preflight_persistence` /
    `comment_mutation_preflight_persistence` categories. Ownership-moderation
    authorization preflights remain inside the same mutation boundary with
    stable `post_authorization_persistence` or
    `comment_authorization_persistence` categories; expected denials remain
    quiet and preserve their original errors.
  - Post and comment reaction toggles emit redacted
    `post_reaction_toggled` / `comment_reaction_toggled` events with request
    correlation, actor/target IDs, action, emoji, status, and duration;
    unexpected persistence failures use stable reaction categories.
  - Post channel, feed, single-post, and comment reads keep actor-profile
    preflight failures inside the same redacted `post_read_failed` event with
    the stable `post_read_persistence` category; expected missing-profile
    outcomes remain quiet and post/comment content stays excluded.
  - Post-notification group and mark-all read-state mutations emit redacted
    `notification_group_marked_read` / `notifications_marked_read` events with
    request correlation, actor/target metadata, read scope, status, and
    duration; unexpected persistence failures use the stable
    `notification_read_state_persistence` category, including actor-profile
    preflight failures; expected missing-profile outcomes remain quiet.
  - Notification summary reads are client-polled, so only failures emit log
    events: redacted `notification_summary_load_failed` with request
    correlation, actor ID, requested limit, and duration; notification content,
    post excerpts, author details, and raw persistence details remain excluded,
    while unexpected failures use `notification_summary_read_persistence`,
    including actor-profile preflight failures.
  - Admin Zoom-link create, update, and delete mutations emit redacted
    `zoom_link_created`, `zoom_link_updated`, and `zoom_link_deleted` events
    with request correlation, actor/link IDs, ownership section, status, and
    duration; teacher-owner preflight failures reuse redacted
    `zoom_link_mutation_failed` telemetry with the stable
    `zoom_link_persistence` category. Credentials, meeting IDs, URLs, titles,
    and raw persistence details remain excluded; unexpected Admin-role
    preflight failures reuse the same event with the stable
    `zoom_link_authorization_persistence` category. Expected authorization and
    validation outcomes remain quiet.
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
    stable `exam_attempt_persistence` or `exam_answer_persistence` categories,
    including exam and attempt preflight lookup failures.
  - Teacher exam grading emits redacted `exam_open_answer_graded` and
    `exam_grading_finalized` events with request correlation,
    grader/attempt/exam/question metadata, status, and duration. Awarded
    points, aggregate scores, answer text, and raw persistence details remain
    excluded; unexpected failures use `exam_grading_persistence`.
  - Exam author/catalog and attempt reads emit redacted `exam_read_loaded` /
    `exam_read_failed` events with request correlation, actor/exam/attempt IDs,
    role, safe result counts, status, and duration. Exam titles, question
    prompts, option labels, answers, scores, and raw persistence details remain
    excluded; unexpected failures use `exam_read_persistence`. Unexpected
    teacher/admin authorization preflight failures for exam creation reuse
    `exam_create_failed` with the stable `exam_authorization_persistence`
    category; expected denials remain quiet.
  - Discipleship board and student-view reads emit redacted
    `discipleship_read_loaded` / `discipleship_read_failed` events with request
    correlation, actor/teacher IDs, scope, safe counts, view kind, status, and
    duration. Names, email addresses, avatars, schedules, and raw persistence
    details remain excluded; unexpected failures use
    `discipleship_read_persistence` while expected authorization outcomes stay
    quiet.
  - Discipleship assignment, pairing, and schedule mutations emit shared
    redacted `discipleship_mutation_completed` / `discipleship_mutation_failed`
    events. Unexpected role-store failures use the stable
    `discipleship_authorization_persistence` category; expected denials,
    not-found outcomes, and pairing conflicts remain quiet.
  - Enrollment list and detail reads emit redacted
    `enrollment_read_loaded` / `enrollment_read_failed` events with request
    correlation, actor/enrollment IDs, pagination and view metadata, safe
    result counts, status, and duration. Applicant identity, contact details,
    application answers, evaluation payloads, and raw persistence details
    remain excluded; unexpected failures use
    `enrollment_read_persistence` while expected authorization and not-found
    outcomes stay quiet.
  - Post channel, feed, single-post, and comment reads emit redacted
    `post_read_loaded` / `post_read_failed` events with request correlation,
    actor/post/course IDs where applicable, read scope, safe result counts,
    pagination metadata, comment counts, status, and duration. Post/comment
    content, author payloads, and raw persistence details remain excluded;
    unexpected failures use `post_read_persistence` while expected
    authorization and not-found outcomes stay quiet.
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
  - `repository/` - Shared table-oriented database seams. `profiles.repository.ts`
    is the single owner for profile-only reads and writes reused across features
    (email, identity, avatar, student, teacher, discipleship, and enrollment support).
    It also owns the restricted staff/public identity projections used by the
    discipleship view. `calendar-events.repository.ts`
    owns calendar-event-only reads and writes reused across calendar and event services;
    the course-joined event listing remains in the event feature service. Feature
    repositories remain responsible for aggregate or joined queries until their
    tables are migrated to this shared layer. `account-security.repository.ts`
    owns account-security-only email-change and password-reset state reads and
    writes; profile email-change transactions use its transaction-scoped table
    helpers alongside transaction-scoped profile updates from
    `profiles.repository.ts`, with the profile service preserving atomicity.
    `enrollments.repository.ts` now
    owns enrollment-only reads and writes reused across enrollment and campaign
    services. `assignments.repository.ts` now
    owns assignment-only reads and writes reused across assignment and course
    services. `submissions.repository.ts` owns submission-only reads and writes
    reused across assignments, courses,
    and student-directory services. `invitations.repository.ts` owns
    invitation-only reads and writes reused across invitation, signup, enrollment,
    and email-campaign services. `course-teachers.repository.ts` owns
    course-teachers-only reads and writes reused across course, assignment,
    teacher, attendance, student, and enrolment services. Joined course/teacher
    views remain in their feature repositories. New profile-only,
    course-teachers-only,
    Staff Privilege-only access must use `@/utils/repository`; its
    `staff-privileges.repository.ts` owns the shared table-only reads and writes reused
    across authorization, teacher-directory, enrolment, and staff privilege services. New
    `course-substitutes.repository.ts` owns course-substitute-only reads and writes reused
    across enrolment substitution services; the atomic substitution transaction keeps its
    reviewer reassignment orchestration in the enrolment feature repository and delegates
    the table write through a transaction-scoped adapter. New course-substitute-only access
    must use `@/utils/repository`.
    enrollment-only, invitation-only, assignment-only, or submission-only access must use
    `@/utils/repository`. `lessons.repository.ts` now owns lesson-only reads and
    writes reused across assignment and course services. New lesson-only access
    must use `@/utils/repository`; joined lesson/course/assignment reads remain
    in their feature repositories. `courses.repository.ts` owns course-only reads and
    writes reused across course, image-upload, lesson-calendar, attendance, and
    student-directory services. New course-only access must use `@/utils/repository`;
    joined course/lesson/media/teacher reads and course-plus-teacher creation remain
    in their feature repositories. `zoom-links.repository.ts` owns zoom-link-only
    writes; joined zoom-link/teacher reads remain in the Zoom Link feature repository,
    while profile-only role lookups use `profiles.repository.ts`. New zoom-link-only
    or profile-only access must use `@/utils/repository`. `enrollment-evaluations.repository.ts` owns
    enrollment-evaluation-only writes reused by the enrollment review service;
    joined evaluation/profile reads remain in the enrolment feature repository.
    `media-library.repository.ts` owns media-library-only reads and writes reused by
    the library service; the course-enriched media listing remains in the library
    feature repository. `post-notifications.repository.ts` owns post-notification
    delivery inserts, group reads, and read-state writes; the post/course/profile-
    enriched notification summary rows remain in the notification feature repository. New
    media-library-only or post-notification-only access must use
    `@/utils/repository`. `discipleship-assignments.repository.ts` owns
    discipleship-assignment-only reads and writes reused by the discipleship and Zoom Link
    services. `discipleship-groups.repository.ts` owns group-only reads and writes used by
    the discipleship service. `discipleship-pairs.repository.ts` owns pair-only reads and
    writes used by the discipleship service. New group-only or pair-only access must use
    `@/utils/repository`.
    `email-messages.repository.ts` owns email-message log inserts used by the bulk email
    campaign. `email-campaign-locks.repository.ts` owns email-campaign mutex reads and
    writes; campaign recipient planning remains in the email feature repository because
    it joins enrollments and invitations. New email-message-only or email-campaign-lock-only
    access must use `@/utils/repository`.
    `whatsapp-messages.repository.ts` owns WhatsApp message dedupe reads and delivery-log
    inserts used by the bulk WhatsApp campaign; recipient planning and campaign-lock access
    remain in the WhatsApp feature repository. New WhatsApp-message-only access must use
    `@/utils/repository`. `attendance-sessions.repository.ts` owns attendance-session
    reads and atomic open/close persistence, while `attendance-presents.repository.ts`
    owns present-only reads and transaction-scoped present writes. Attendance feature
    repositories retain only course/lesson/student projections and orchestration that
    spans both attendance tables; new table-only attendance access must use
    `@/utils/repository`.
  - Lesson detail reads require a persisted profile and expose unpublished
    lessons/draft assignments only to course teachers or admins; non-managers
    receive published lesson/assignment data only.
  - Course detail reads expose unpublished lessons and media only to the
    assigned course teachers or admins; other teachers receive published
    course content only.
  - Course catalog reads expose unpublished lessons only to the assigned
    course teachers or admins; other teachers receive published lessons only.
  - Calendar event listing and mutations use `event/service/event.service.ts`
    for the teacher/Admin service boundary and redacted `calendar_event_*`
    operational events; table-owned calendar-event CRUD is delegated to
    `repository/calendar-events.repository.ts`. Event-list reads emit safe
    count metadata and stable `calendar_event_read_persistence` failure
    categories. Teacher/admin role preflights remain inside the list and
    mutation telemetry boundaries, using stable operation-specific persistence
    categories for unexpected failures while expected authorization outcomes
    remain quiet. Titles, descriptions, locations, meeting links, and
    timestamps remain excluded.
  - Zoom-link list reads emit redacted `zoom_links_loaded` /
    `zoom_links_load_failed` events with request correlation, actor ID, viewer
    role, safe link and teacher-option counts, status, and duration. Titles,
    descriptions, meeting URLs, meeting IDs, passcodes, and raw persistence
    details remain excluded; unexpected failures use
    `zoom_links_read_persistence`, including viewer-role preflight failures.
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
    - `index.ts` - Main exports: emit(event) resolves recipients with redacted
      `notification_recipients_resolved` / `notification_recipient_resolution_failed`
      telemetry and keeps recipient lookup and delivery failures best-effort
    - Usage: `await emit(createPostCreatedEvent(actorId, postId, courseId, canModerate))`
  - `email/` - Shared outbound email utilities:
    - `types.ts`: `EmailSender` port and typed transactional email message shapes.
    - `sender/resend-email-sender.ts`: Resend adapter, template rendering, subjects, and provider error normalization.
    - `index.ts`: `getEmailSender` / `setEmailSender` seam plus shared transactional and invitation sending primitives.
    - `domain/`: pure campaign resolver and bulk invitation planner.
    - `email-campaign.ts`, `service/`, `repository/`: admin-only bulk invitation email campaign server functions, lock handling, and logging. Send-path lock, sender-profile, planning, invitation, enrollment-marking, and message-record persistence failures use redacted structured events with stable categories; provider delivery failures retain their delivery category.
  - `whatsapp/`: Admin-only bulk WhatsApp campaign server functions, lock handling, delivery logging, and provider adapter.
    - Campaign lock inspection and explicit release are authorized in the service layer, so direct callers cannot bypass the Admin boundary. Both operations emit redacted lock-count/release telemetry with stable persistence categories.
    - Send-path lock lookup, recipient planning, and message-record persistence failures emit redacted failure telemetry with request correlation and stable categories; provider delivery failures retain their delivery category and recipient phone/name/provider details remain excluded.

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
