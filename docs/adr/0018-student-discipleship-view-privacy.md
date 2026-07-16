# ADR 0018 — Student Discipleship View Privacy

**Status:** Accepted
**Date:** 2026-07-15

## Context

The discipleship board at `/discipleship` was staff-only: Teacher-users manage
their own column; Admins manage all. Students need a read-only surface for their
own schedule (individual, peer pair, and group monthly anchors under their
Teacher-user) and visibility into who else is under that same discipler,
including peer-pair structure.

Schedule times for other students are sensitive. Showing only names while still
revealing pairing structure is a deliberate social/privacy trade-off. Application
reads use the Drizzle service DB via `getDb()` and bypass Supabase RLS, so column
redaction must happen in the service/DTO layer (same pattern as ADR 0005 and the
exam correct-answer secrecy rule in ADR 0017). RLS cannot hide columns and is not
the student-view boundary.

## Decision

1. **Same route, role-branched UI.** `/discipleship` stays a single path. Staff
   receive the existing manage board DTO. Students receive a dedicated
   **Student Discipleship View** DTO — never the staff board shape.
2. **Service DTO is the privacy boundary.** `getStudentDiscipleshipViewService`
   (and a pure domain builder) assemble a minimal payload. RLS policies on
   discipleship tables remain staff-select for client-scoped paths; they are not
   expanded for this feature.
3. **What a Student may see when assigned:**
   - Teacher-user: `fullName`, `avatarUrl` (no email)
   - Own individual anchor, own pair anchor (or unpaired), group anchor under
     that Teacher-user
   - Own peer partner: `fullName`, `avatarUrl`
   - Same-teacher roster: name + avatar only, **grouped by Peer Pair** with solos
     listed separately; viewer excluded from the generic roster lists
4. **What never leaves the server for students:**
   - Other students' individual anchors
   - Other pairs' anchors (except the viewer's own pair)
   - Email addresses of teacher or classmates
   - Other Teacher-user columns, unassigned pool, or manage/mutation affordances
5. **Unassigned Students** still open the page and get an empty state; no roster.

## Alternatives Considered

- **Reuse staff board with UI-only redaction** — rejected; full emails and other
  times would still ship in the JSON payload.
- **Expand RLS for student SELECT** — rejected as incomplete (cannot hide times
  while exposing pair membership) and unnecessary while reads use service DB.
- **Flat classmate names only (no pair structure)** — rejected after product
  choice to show peer pairings for social awareness while keeping times private.
- **Separate `/my-discipleship` route** — rejected for simpler shared nav and one
  discipleship entry point.

## Consequences

- Student payloads must be asserted in unit and integration tests: no classmate
  email keys, no foreign `anchorAt` values, no teacher columns outside the
  viewer's assignment.
- Staff board and mutations stay behind existing `canManageDiscipleship` / staff
  route logic; students cannot call assign/pair/schedule server fns successfully.
- Future client-side queries that hit Supabase with the user JWT would still be
  blocked by staff-only RLS; do not treat RLS expansion as a substitute for DTO
  redaction if that ever changes.
