# src/utils/auth.ts (Deep Dive)

## Purpose

Centralizes authentication and authorization helpers used by server functions and route loaders.

## Responsibilities

- Fetch the current authenticated Supabase user (`getCurrentUser`).
- Provide reusable authorization checks for roles and course access.

## Invariants

- Auth checks must be performed server-side.
- Role checks use the `profiles` table as the source of truth.
- If role names change (enum values), update this doc and the schema docs.

## Key Exports

- `getCurrentUser()`
  - Uses `getSupabaseServerClient()` to fetch the current Supabase user.
  - Throws when not authenticated.

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
