# ADR 0019 — Teacher-Owned Zoom Links

**Status:** Accepted
**Date:** 2026-07-17

## Context

Zoom credentials were modeled as either academy lectures or course-scoped
`discipleship_group` links. Discipleship placement is now explicitly represented by
`discipleship_assignments`: each Student may have one discipling Teacher-user. Course
membership is therefore the wrong ownership and visibility boundary for discipleship
meeting credentials.

Zoom URLs, meeting IDs, and passcodes are credentials. Student payloads must not include
another teacher's credentials, even if the UI would hide their cards. ADR 0018 also keeps
the discipleship tables staff-select-only under RLS, so Zoom visibility must not broaden
direct Student access to those tables.

## Decision

1. **Two Zoom link kinds.** A **General Zoom Link** has
   `section = 'general_class_lecture'` and no owner. A **Teacher Zoom Link** has
   `section = 'teacher'` and exactly one `teacherId`. The database check constraint and
   discriminated Zod inputs enforce both combinations. Owners must have profile role
   `teacher` or `admin`; Admins may own links because they may act as disciplers.
2. **No Course ownership.** `zoom_links.course_id` is removed. General links are
   academy-wide. Multiple links per teacher are allowed. Credentials remain on `/zoom`;
   `/discipleship` supplies only Student-to-Teacher placement.
3. **Role-based visibility before payload construction.** Teacher-users and Admins receive
   every General and Teacher Zoom Link. Assigned Students receive every General Zoom Link
   plus only their assigned Teacher-user's links. Unassigned Students receive General
   Zoom Links only. Filtering happens in the pure Zoom domain layer before the loader
   payload is returned, so unauthorized credentials never reach the browser.
4. **RLS backstop without weakening ADR 0018.** The Zoom SELECT policy mirrors application
   visibility. A `SECURITY DEFINER` helper reads the current caller's assignment while
   accepting no caller-controlled user ID: it is scoped solely by `auth.uid()`, uses an
   empty `search_path`, and exposes only the assigned `teacher_id`. Discipleship-table
   policies remain staff-select-only.
5. **Ordering matches the Teachers page.** Teacher groups use the most recently assigned
   Course's `orderIndex`; profiles without a Course follow by profile creation time. Empty
   groups are omitted. Within each teacher group, links sort by `orderIndex`, then title.
   General links use the same per-link ordering.
6. **Legacy deletion is deliberate.** Migration `0037` preserves existing General Zoom
   Links, removes their obsolete Course association, and deletes every legacy
   `discipleship_group` row. Those rows are not guessed or migrated to teachers because
   their Course ownership cannot identify the intended discipler safely.

## Consequences

- Reassigning a Student changes visible Teacher Zoom Links on the next `/zoom` load.
- Deleting an owner profile cascades deletion of their Teacher Zoom Links.
- Admin edit payloads include ordered owner options; Student and Teacher-user payloads do
  not include that editing-only list.
- Future Zoom reads must keep server-side projection/filtering as the credential boundary;
  RLS is defense in depth, not permission to ship all rows and hide them in React.
- Restoring a deleted legacy course link requires an Admin to recreate it with an explicit
  Teacher-user or Admin owner.
