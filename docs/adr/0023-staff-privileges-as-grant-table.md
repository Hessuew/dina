# ADR 0023 — Staff Privileges as a grant table

**Status:** Accepted
**Date:** 2026-08-17

## Context

Some Teacher-users need extra capabilities without becoming Admin and without a
fourth Role: academy-wide Present override, and enrolment contact export. Role
today is only `student | teacher | admin`. Attendance override is Course Teacher
or Admin. Enrolment export is Admin-only (ADR 0005 redacts email/phone from
teachers). Profile columns today store identity and notification prefs, not
capabilities. `course_substitutes` already models an Admin grant as a table.

## Decision

1. **Keep Role unchanged.** Extra power is a **Staff Privilege** granted to a
   Teacher-user. Admins already have every privilege; Students never receive one.
2. **Persist grants in `staff_privileges`**, unique `(user_id, privilege)`, with
   a closed enum (`attendance_override`, `enrollment_contact_export`). Revoke
   deletes the row. No `granted_by`.
3. **Live check** is `role = admin` OR (`role = teacher` AND grant). Write
   rejects unless the target Role is `teacher`. Orphan rows after a later role
   change are ignored.
4. **Privileges are independent.** Attendance override does not open live
   Attendance Sessions on foreign courses. Contact export unlocks Export
   Contacts only; the enrolments list stays the Redacted Enrollment View
   (ADR 0005). Campaigns stay Admin-only.
5. **Admin-only grant UI** on the existing `/teachers` TeacherModal. Catalog
   payloads omit grants for non-admins.

## Alternatives considered

- **Fourth Role** (`staff`) — rejected. User still teaches; Role change would
  mix identity with a couple of extra buttons.
- **Two booleans on `profiles`** — rejected. Named independent privileges
  already need a third later; columns would grow and fight the glossary.
- **Unredact the enrolments list for exporters** — rejected. Export is a
  deliberate copy action; list-wide PII would reverse ADR 0005.

## Consequences

- Adding a privilege is a new enum value plus a live-check call site.
- `hasStaffPrivilege` sits beside `resolveAdminOrTeacherAccess`; it is not a
  Course Teacher `EntityPermissions` flag.
- CONTEXT.md owns the Staff Privilege glossary; this ADR owns why a grant
  table was chosen over Role or profile flags.
