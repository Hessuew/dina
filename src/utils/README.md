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
    tokens, and provider messages are excluded.
  - `observability/request-context.ts`: keeps the Cloudflare/request
    correlation ID available through nested request and server-function work;
    it prefers `cf-ray`/`x-request-id` and generates a UUID when neither is
    present.

- **Supabase utilities**
  - `supabase.ts`: server client (`@supabase/ssr`) and admin client.

- **Feature server function modules**
  - `courses/` - Course management split by aggregate:
    - `course.ts` - Course CRUD, publishing, teacher assignment orchestration
    - `lesson.ts` - Lesson CRUD, scheduling, ordering, calendar queries
    - `teacher-assignment.ts` - Teacher-course relationship management (2-teacher invariant)
    - `index.ts` - Re-exports all functions for backward compatibility
  - `assignments.ts`, `students.ts`, `teachers.ts`, `calendar.ts`, `events.ts`, `invitations.ts`, `enrollments.ts`, `posts.ts`, `library.ts`.
  - `attendance/` — live Attendance Session open/close, student self check-in (`markPresent`), and Course Teacher/Admin/privileged-teacher override (`setStudentPresent`) from student detail.
  - `staff-privilege/` — Staff Privilege grants (ADR 0023): domain live-check, Admin grant/revoke, `hasStaffPrivilege` used by attendance override and enrolment contact export.
  - `exam/` — Timed exam authoring, attempt lifecycle, autosave, lazy finalization, and grading (ADR 0017).
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

- **Role-gated route helpers**
  - `admin.ts`: shared admin-only access check for routes (legacy, migrate to authz).

- **Datetime helpers** (`datetime/`)
  - Pure glue for `<input type="datetime-local">`: `toDatetimeLocalValue` / `parseDatetimeLocalValue`.
  - Always use browser-local wall-clock components (`getHours`, …). Never `toISOString().slice` for form load — that is UTC and shifts displayed times by the host offset.

- **Misc**
  - `imageUpload/` and `storage/`: private upload helpers.
    - Request server functions validate metadata and mint actor-owned signed upload URLs.
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
