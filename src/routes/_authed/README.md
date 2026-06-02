# src/routes/\_authed

## Purpose

Authenticated application routes.

Everything in this folder is under the `/_authed/*` route tree and is protected by the layout route in `src/routes/_authed.tsx`.

## What Lives Here

This folder contains feature areas implemented as route files:

- **Dashboard**: `dashboard.tsx`
- **Courses**: `courses/index.tsx`, `courses/$courseId.tsx`
- **Assignments**: `assignments/index.tsx`, `assignments/$assignmentId.tsx`
- **Students**: `students/index.tsx`, `students/$studentId.tsx`
- **Lessons**: `lessons/$lessonId.tsx`
- **Calendar**: `calendar.tsx`
- **Events**: `events.tsx`
- **Invitations**: `invitations.tsx`
- **Teachers**: `teachers.tsx`
- **Posts**: `posts.tsx`
- **Library**: `library/index.tsx`, `library/$mediaId.tsx`
- **Enrollments**: `enrollments.tsx`, `enrollments/$enrollmentId.tsx`

## Key Invariants / Assumptions

- **Auth is enforced by the parent layout**
  - `src/routes/_authed.tsx` checks `context.user` in `beforeLoad`.
  - Routes here can assume `context.user` exists, but server functions should still use server-side auth utilities.

- **Route naming / params**
  - Dynamic routes use `$param` filenames per TanStack Router conventions.

## Common Change Recipes

- **Add a new feature section under authenticated routes**
  - Add a route file or subfolder here.
  - Update this README with the new entry point.

- **Add a new detail page**
  - Add `$id.tsx` under the relevant feature folder.

- **Change authentication behavior**
  - Edit `src/routes/_authed.tsx`.
  - If you change auth assumptions, update `src/routes/README.md` and `docs/ENGINEERING_GUIDE.md` as needed.

## Related Docs

- `src/routes/README.md`
- `docs/ENGINEERING_GUIDE.md`
