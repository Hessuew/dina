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

- **Supabase utilities**
  - `supabase.ts`: server client (`@supabase/ssr`) and admin client.

- **Feature server function modules**
  - `courses/` - Course management split by aggregate:
    - `course.ts` - Course CRUD, publishing, teacher assignment orchestration
    - `lesson.ts` - Lesson CRUD, scheduling, ordering, calendar queries
    - `teacher-assignment.ts` - Teacher-course relationship management (2-teacher invariant)
    - `index.ts` - Re-exports all functions for backward compatibility
  - `assignments.ts`, `students.ts`, `teachers.ts`, `calendar.ts`, `events.ts`, `invitations.ts`, `enrollments.ts`, `posts.ts`, `library.ts`.
  - `attendance/` — live Attendance Session open/close, student self check-in (`markPresent`), and Course Teacher/Admin override (`setStudentPresent`) from student detail.
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
    - `delivery.ts` - Delivery adapters (DatabaseDeliveryAdapter for DB writes)
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
