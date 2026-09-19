# src/utils/auth.ts (Deep Dive)

## Purpose

Centralizes authentication and authorization helpers used by server functions and route loaders.

## Responsibilities

- Fetch the current authenticated Supabase user (`getCurrentUser`).
- Provide reusable authorization checks for roles and course access.

## Invariants

- Auth checks must be performed server-side.
- Role checks use the shared profiles repository, which reads the `profiles` table as the source of truth.
- If role names change (enum values), update this doc and the schema docs.

## Key Exports

- `loginService(data)`
  - Performs Supabase password sign-in and returns the provider message on a
    rejected login for the existing UI error mapper.
  - Emits redacted `login_succeeded` / `login_failed` telemetry with request
    correlation, outcome, duration, safe user ID on success, and provider code
    plus a stable error category on rejection. Email, password, and provider
    messages are never logged.

- `logoutService()`
  - Signs out through Supabase and emits redacted `logout_succeeded` /
    `logout_failed` telemetry with request correlation, outcome, duration, and
    stable provider error fields. Provider messages are never logged.

- `getCurrentUser()`
  - Uses `getSupabaseServerClient().auth.getClaims()` to verify the session
    JWT locally against the cached JWKS (falls back to an Auth-server check on
    symmetric-key projects). Returns `{ id, email }` from the token claims;
    revocation is bounded by token expiry rather than a per-call server check.
  - Throws when not authenticated; unexpected provider exceptions emit a
    redacted `auth_session_lookup_failed` event with request correlation,
    duration, and the stable `auth_session_lookup` category.

- `getUserProfile(userId)`
  - Loads the persisted profile through `src/utils/repository/profiles.repository.ts`.
  - Unexpected database failures emit a redacted
    `auth_profile_lookup_failed` event with request correlation, the safe user
    ID, duration, and the stable `auth_profile_read_persistence` category.

- `requireAuth(userId)`
  - Assertion helper to ensure an ID is present.

- `requireRole(userId, role)` / `requireAdmin(userId)` / `requireTeacher(userId)`
  - Loads `profiles` and checks the `role` field.

- `requireTeacherOfCourse(userId, courseId)`
  - Checks course-teacher relationship via `course_teachers`.

- `getCourseAccess(userId, courseId)`
  - Determines course access mode (teacher vs student).

## Common Change Recipes

- Add a new authorization helper
  - Put it here.
  - Keep checks small and composable.

- Change auth provider behavior
  - Update `src/utils/supabase.ts` and callers.
  - Ensure `src/routes/__root.tsx` still populates `context.user` correctly.
