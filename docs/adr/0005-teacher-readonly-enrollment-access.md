# ADR 0005: Teacher Read-Only Access to Enrollment Submissions

**Status:** Accepted  
**Date:** 2026-05-25

## Context

The enrollment review surface (`/enrollments` list and `/enrollments/$id` detail) was admin-only at every layer: RLS policies, server-fn authz (`hasRole('admin')`), route `beforeLoad` guards, and the sidebar nav. The permission matrix in `BUSINESS_RULES.md` explicitly excluded teachers from application review.

Teachers needed visibility into applicant submissions to support their teaching and mentorship role — knowing who is entering the cohort before the term begins. However, enrollment records contain sensitive PII (email, phone/WhatsApp) that belongs to the admin-managed outreach workflow, not to teacher-facing review.

## Decision

Relax the enrollment read guard from admin-only to teacher-or-admin, with server-side field redaction for non-admin viewers.

**What teachers see (read-only):**
- Full legal name, preferred name, year of birth, gender, nationality/citizenship
- Current city/country, church affiliations
- Personal essays (aboutYourself, expectationsAlignment)
- Enrollment status, submission date

**Hidden from teachers (stripped server-side, never sent to client):**
- Email address
- Phone/WhatsApp
- Invitation tracking fields (invitationSent, invitationId)

**Admin access unchanged** — full record, status change, send invitation, delete.

Redaction is enforced in the server functions (`getEnrollments`, `getEnrollmentById`) before data leaves the server. RLS policies are not changed because these reads use the service DB via Drizzle, bypassing RLS.

## Alternatives Considered

- **Keep admin-only** — rejected because teachers have a legitimate need to know their incoming cohort.
- **Full record for teachers** — rejected to protect applicant contact details; admin owns outreach, teachers should not initiate direct contact with applicants.
- **Separate teacher-specific endpoint** — considered but unnecessary; server-side conditional redaction in existing endpoints is sufficient and avoids duplicated query logic.
- **RLS policy for teacher SELECT** — skipped because reads go through the Drizzle service DB (not the user-scoped Supabase client), so RLS is not hit for these reads.

## Consequences

- `BUSINESS_RULES.md` permission matrix updated: Teacher gains "View Enrollments (read-only, redacted)".
- A new `checkTeacherAccess` server fn guards the two enrollment routes instead of `checkAdminAccess`.
- `redactEnrollmentForTeacher` helper added to `src/utils/enrolment/domain/enrolment.domain.ts`.
- `EnrollmentsTable` and the detail page conditionally hide admin-only UI (status select, invite/delete actions, email, phone) when `isAdmin` is false.
- Enrollments nav item moved from "For admins" sidebar section to "For teachers" (admins still see it there since they render both groups).
- Server-side enrollment search (`findEnrollmentsPage`) excludes the `email` field from the `WHERE` clause when `includeEmail: false` (i.e. for teachers). This prevents teachers from probing for a redacted email value via the search box, which would otherwise reveal whether a given email exists in the dataset.
