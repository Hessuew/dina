# Request-Identity-Aware RLS Plan

**Status:** Design complete — hosted identity and policy verification remain
external follow-up
**Phase:** Engineering Roadmap Phase 5: Security
**Owner:** Engineering

## Purpose

DINA's server-side repositories use a direct Postgres connection through
Hyperdrive (`getDb()`), not the browser Supabase data API. That connection does
not automatically carry the caller's Supabase JWT claims, so `auth.uid()` and
`auth.role()` cannot currently be treated as the application request identity.
Application authorization in `src/utils/*/service/` is therefore the active
boundary for server requests. RLS is defense in depth for user-scoped Supabase
requests and must not be enabled or tightened on legacy tables until the
request identity contract is proven.

This document defines the smallest safe path to request-identity-aware RLS. It
is a plan and evidence contract; it does not authorize changing hosted policies
or production connection roles by itself.

## Non-negotiable invariants

1. **Application authorization remains mandatory.** Enabling RLS does not remove
   `getCurrentUser()`, persisted-profile checks, ownership checks, course-team
   checks, or role/privilege checks from server functions.
2. **No caller-controlled identity reaches a trusted database setting.** A
   future request scope may set a transaction-local identity only from the
   verified Supabase session subject and role, never from a form field or route
   parameter.
3. **Connection pooling must not leak identity.** Any identity setting must be
   transaction-local (`set_config(..., true)` or an equivalent transaction
   wrapper), and the transaction must be complete before the connection is
   reused for another request.
4. **Service-role and migrations stay explicit exceptions.** Provisioning,
   migrations, restore drills, and other trusted operations must use a distinct
   role/path and must not inherit end-user claims.
5. **RLS cannot provide column redaction.** Exam answer secrecy, private media
   DTOs, and other response-shape protections stay in application services.

## Current boundary inventory

| Boundary                          | Current state                                                                                                                                | RLS decision before identity work                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Server functions and repositories | Direct Hyperdrive/Postgres connection; app authorization is enforced in services                                                             | Keep service checks and do not assume `auth.uid()` is populated                      |
| Browser Supabase client           | Used for Auth and direct Storage upload flows; not the repository DB path                                                                    | Verify separately; do not infer database request identity from Storage success       |
| Existing SQL policies             | Several domain tables have Supabase `authenticated` policies; final hosted state must be inspected, not inferred only from migration history | Treat policies as defense-in-depth until hosted tests prove the intended caller path |
| Profile role changes              | Migration `0056_profile_role_guard` blocks authenticated non-Admin role changes and preserves trusted provisioning                           | Keep the trigger; verify with hosted JWT claims before changing profile policies     |
| Private Storage                   | Object access is protected by bucket/object policy plus server-minted paths and signed URLs                                                  | Keep Storage policy verification separate from Postgres RLS                          |

## Policy workstreams

The workstreams are ordered so each policy family has a tested identity and
relationship model before it is tightened. The table names follow the current
schema; hosted environments may contain older or additional objects and must be
inventoried first.

| Workstream                  | Tables                                                                                               | Required policy shape                                                                                      | Required application proof                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Identity and profiles       | `profiles`, `account_security`                                                                       | Own-profile reads/updates; Admin-only staff/profile management; no role escalation                         | Profile role trigger tests, session-subject matching, and no service secret in the browser            |
| Course content              | `courses`, `course_teachers`, `lessons`, `assignments`, `media_library`, `lesson_progress`           | Published student reads; assigned-teacher/Admin authoring; own student progress/submissions only           | Outsider-teacher draft denial, student publication filtering, and DTO tests for private paths/content |
| Assignments and grading     | `submissions`, `enrollment_evaluations`, `enrollment_reviewer_assignments`                           | Student own submission rows; assigned reviewer/team or Admin grading/evaluation access                     | Ownership, reviewer substitution, and Admin escalation regressions at service level                   |
| Exams                       | `exams`, `exam_questions`, `exam_question_options`, `exam_attempts`, `exam_answers`                  | Published student taking; own in-progress attempt writes; staff grading access                             | ADR 0017 response-shape tests plus attempt ownership/status transition tests                          |
| Community and notifications | `posts`, `post_comments`, reactions, `post_notifications`, `notifications`                           | Authenticated feed visibility as intended; own writes/read-state; staff moderation                         | Persisted-profile prerequisite, ownership, moderation, and notification read-state tests              |
| Staff operations            | `enrollments`, invitation/campaign tables, `staff_privileges`, `whatsapp_messages`, `email_messages` | Admin-only sensitive enrollment/campaign/privilege access; narrowly scoped teacher review where documented | Direct service calls from student/teacher/unknown actors fail before persistence or provider work     |
| Attendance and mentoring    | `attendance_sessions`, `attendance_presents`, discipleship tables, `course_substitutes`              | Assigned course/team or explicit privilege; own student check-in; Admin management                         | Course assignment, override privilege, substitution, and student ownership regressions                |
| Calendar and links          | `calendar_events`, `zoom_links`                                                                      | Authenticated published visibility; staff/Admin mutation; student-specific link filtering                  | Event manager checks and student Zoom visibility tests remain active                                  |

RLS policies must use the same persisted profile and relationship semantics as
the application. A policy that says “teacher” without checking course
membership is not equivalent to the server authorization contract.

## Identity propagation decision gate

Before any legacy policy migration, capture this evidence in a non-production
Supabase branch:

1. Record the Hyperdrive/database role attributes (`rolname`, `rolsuper`,
   `rolbypassrls`) and whether the role owns the application tables.
2. With a synthetic Student and Admin JWT, verify `auth.uid()` and
   `auth.role()` through the exact user-scoped database path proposed for the
   application. Record only role names and pass/fail results.
3. Verify that a pooled connection cannot retain the previous request's subject
   after a transaction commits or rolls back.
4. Verify that the trusted provisioning path still succeeds without end-user
   claims and that the profile role trigger allows only the documented trusted
   paths.
5. Run anonymous, Student, outsider Teacher, assigned Teacher, and Admin
   negative/positive checks for every policy workstream before production
   rollout.

If any check fails, stop at the design stage. Do not compensate by adding a
caller-supplied UUID, enabling `BYPASSRLS`, weakening a policy, or removing an
application authorization check.

## Migration sequence

1. Inventory hosted tables, policy names, enabled-RLS flags, grants, ownership,
   and role attributes; compare them with `src/db/schema/*.schema.ts` and
   `drizzle/*.sql`.
2. Choose one low-risk policy family and write the identity propagation helper
   plus an integration test against a real Supabase/Postgres branch.
3. Enable or tighten policies in a versioned forward migration only after the
   branch tests pass. Keep a reversible rollback/forward-fix procedure; never
   edit an applied migration in place.
4. Deploy one family at a time, replaying the application integration suite and
   synthetic direct Supabase requests after each migration.
5. Record migration IDs, policy names, role attributes, test timestamps, and
   redacted pass/fail evidence in the Notion security/risk record.

The first candidate should be the profile/role boundary because migration
`0056_profile_role_guard` already supplies a focused trigger contract. Legacy
course, assignment, enrollment, and community policies remain evidence-gated
until the request identity and relationship checks are proven.

## Operator links and evidence locations

- Supabase dashboard: open the project, then **Database → Roles** and
  **Database → Policies** for the hosted role/policy inventory.
- Supabase SQL editor: run only the read-only inventory and synthetic checks in
  a non-production branch first; export redacted query results to the security
  review, never to the repository.
- Repository contract: [SECURITY.md](./SECURITY.md),
  [THREAT_MODEL.md](./THREAT_MODEL.md),
  [database backup/restore runbook](../database-backup-restore-runbook.md),
  and [safe delivery](./SAFE_DELIVERY.md).
- External record: update the Notion Security/Risk and Engineering Roadmap
  records with the hosted project, migration IDs, policy names, evidence date,
  owner, and rollback decision. Do not store JWTs, database URLs, or secret
  values.

## Rollback and stop conditions

Stop rollout and use the documented forward-fix/rollback procedure if any
policy unexpectedly denies a trusted provisioning path, exposes a row to an
outsider, loses identity after connection reuse, or makes an application
request depend on a caller-supplied identity. Keep the previous application
authorization checks in place during rollback and re-run the affected
workstream's negative tests before reopening traffic.
