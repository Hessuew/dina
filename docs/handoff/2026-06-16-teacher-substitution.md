# Handoff: Teacher Substitution Feature (DINA)

**Date:** 2026-06-16  
**Repo:** `/Users/juhanijuusola/Documents/start-supabase-basic`  
**Branch at session end:** `06-15-refactor_enrolment_extract_validatesearch_into_enrollments-search_domain_util_crap_paydown_`  
**Session type:** Design + planning (`/grill-with-docs`). **Zero implementation files were written.**  
**Next session goal:** Full implementation of the Teacher Substitution feature as designed below.

---

## Context

This session ran a `/grill-with-docs` session to design Teacher Substitution for the DINA
enrollment review system. The existing domain is fully documented in:

- **`CONTEXT.md`** — domain glossary (Teacher-user, Peer, Reviewer, Peer Review, etc.)
- **`docs/adr/0007-peer-review-via-course-partner-cross-evaluation.md`** — peer review design (key reference)
- **`docs/adr/0008-auto-status-from-reviewer-score.md`** — Reviewer score drives enrollment status

Read those files before touching a line of code.

---

## Problem Being Solved

The system assumes one teacher per course, evaluating only their assigned enrollments and
peer-reviewing their course partner's high-stakes admits. A new operational need: a teacher
(Teacher A, on Course 1) needs to **substitute** for an absent teacher (Teacher B, on Course 2).
This means:

1. Teacher A takes over Teacher B's Reviewer role for Course 2's assigned enrollments
   (status auto-derivation via ADR 0008 must follow).
2. Teacher A takes over Teacher B's Peer Review responsibility for Teacher C's
   (Teacher B's course partner) admitted enrollments.

**Key constraint discovered during grilling:** Teacher A must NOT be added to `course_teachers`
for Course 2. Doing so causes `findPeerTeacherIds(A)` to return Teacher C as a peer for
Teacher A's Course 1 assignments, silently breaking peer-review state derivation for the wrong course.

---

## Approved Design

### Two new schema artifacts

**1. `course_substitutes` table** (add to `src/db/schema/course.schema.ts`)

```
id                    UUID PK
course_id             UUID FK → courses (CASCADE)
substitute_teacher_id UUID FK → profiles (CASCADE)
absent_teacher_id     UUID FK → profiles (CASCADE)
created_at            TIMESTAMP DEFAULT now()

UNIQUE(substitute_teacher_id, course_id)   — one substitution per (substitute, course)
UNIQUE(absent_teacher_id, course_id)       — one substitute per absence
```

RLS: admins insert/delete; admins + own-teachers select (substitute or absent).

**2. `course_id` on `enrollment_reviewer_assignments`**

- New nullable column `course_id UUID REFERENCES courses(id) ON DELETE SET NULL`
- Backfill: `course_id = reviewer's course from course_teachers` (NULL for admin reviewers — acceptable)
- This column is the "review team namespace": peers for an enrollment are team members of
  `assignment.course_id`, not the reviewer's full course membership across all tables.

**3. `course_teachers.teacher_id` — UNIQUE constraint**

- Upgrade existing non-unique `index('course_teachers_teacher_id_idx')`
  → `uniqueIndex('course_teachers_teacher_id_unique')`
- Enforces "one course per teacher" at DB level
- ADR 0007 said this was a convention; now it is a constraint — add a Rev 2 note to that ADR

### Core architectural change: course-scoped peer lookup

All peer operations now scope through `assignment.course_id` rather than the reviewer's
full `course_teachers` membership.

| Before                                                                               | After                                                                                               |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `findPeerTeacherIds(reviewerId)` — all co-teachers across all courses reviewer is in | `findCourseTeamIds(courseId)` — UNION of `course_teachers` + `course_substitutes` for that courseId |

**`findPeersForReviewers` signature change:**

- Old: `(reviewerIds: string[])` → `Map<reviewerId, {id,name}[]>`
- New: `(courseIds: string[])` → `Map<courseId, {id,name}[]>` (ALL team members; caller filters out reviewer)

**`deriveReviewHeading` change (`src/utils/enrolment/domain/enrolment.domain.ts`):**

- `reviewerAssignments` array gains `courseId: string | null` field
- Instead of `peersForReviewers.get(assignment.reviewerId)`:
  `peersForReviewers.get(assignment.courseId)?.filter(p => p.id !== assignment.reviewerId) ?? []`

### Substitution workflow (admin-initiated, atomic)

`substituteTeacherService(absentTeacherId, substituteTeacherId, adminUserId)`:

1. Validate admin role
2. Find absent teacher's `course_id` from `course_teachers`
3. Insert `course_substitutes` row (unique constraints prevent double-registration)
4. `findUnscoredAssignmentsByReviewer(absentTeacherId)` — assignments where reviewer = absent AND
   reviewer has no evaluation score yet
5. Bulk-reassign all to substitute with `course_id = absent teacher's course`
6. **Steps 3–5 run in a transaction**

`endSubstitutionService(absentTeacherId, adminUserId)`:

1. Validate admin role
2. Delete the `course_substitutes` row for absent teacher
3. Admin separately re-assigns remaining unscored enrollments back to Teacher B via the
   existing reassign UI (not atomic with deletion)

---

## Complete File Change List

### Phase 1 — Schema

| File                                  | Change                                                                                                                                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/schema/course.schema.ts`      | Add `unique`, `uniqueIndex` to imports (remove `index` — no longer used); change `courseTeachers` index to `uniqueIndex`; add `courseSubstitutes` table                                                                    |
| `src/db/schema/enrollment.schema.ts`  | Import `courses` from `./course.schema`; add nullable `courseId` column to `enrollmentReviewerAssignments`                                                                                                                 |
| `drizzle/0030_course_substitutes.sql` | Drop old non-unique index; create unique index; create `course_substitutes` table with RLS; add `course_id` column to `enrollment_reviewer_assignments`; backfill `course_id` from `course_teachers` for teacher reviewers |

### Phase 2 — Repository

File: `src/utils/enrolment/repository/enrolment.repository.ts`

| Symbol                                                                             | Change                                                                                                                                                             |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| imports                                                                            | Add `courseSubstitutes` from `@/db/schema`                                                                                                                         |
| `FindEnrollmentsPageInput`                                                         | Replace `peerIds?: string[]` with `viewerCourseIds?: string[]`                                                                                                     |
| `findEnrollmentsPage`                                                              | Peer condition: `assignment.course_id IN viewerCourseIds AND reviewer ≠ viewer AND reviewer scored 3/4` — join through `enrollment_reviewer_assignments.course_id` |
| `findReviewerAssignmentsForEnrollments`                                            | Return type gains `courseId: string \| null`                                                                                                                       |
| **NEW** `findReviewerAssignmentForEnrollment(enrollmentId)`                        | Returns `{reviewerId: string, courseId: string \| null} \| null` — replaces `findReviewerIdForEnrollment` in authz path                                            |
| `findPeersForReviewers`                                                            | Signature: `(courseIds: string[])` → `Map<courseId, {id,name}[]>` via two queries (course_teachers + course_substitutes) merged in TS                              |
| **NEW** `findCourseTeamIds(courseId: string)`                                      | Returns all member IDs for a course (UNION course_teachers + course_substitutes); used for authz + peerHasScored                                                   |
| **NEW** `findCourseIdsForViewer(userId: string)`                                   | Returns course IDs from both `course_teachers` and `course_substitutes` for a user; used in `getEnrollmentsService`                                                |
| `findPeerTeacherIds(userId)`                                                       | **Remove** — replaced by `findCourseTeamIds` + `findCourseIdsForViewer`                                                                                            |
| `bulkAssignEnrollments`                                                            | Assignment type adds `courseId?: string \| null`                                                                                                                   |
| **NEW** `findUnscoredAssignmentsByReviewer(teacherId)`                             | Returns `{enrollmentId, courseId}[]` where reviewer_id = teacherId AND reviewer's evaluation score IS NULL                                                         |
| **NEW** `insertCourseSubstitute({courseId, substituteTeacherId, absentTeacherId})` | Inserts into `course_substitutes`                                                                                                                                  |
| **NEW** `deleteCourseSubstituteByAbsentTeacher(absentTeacherId)`                   | Deletes `course_substitutes` row for given absent teacher                                                                                                          |
| **NEW** `findCourseIdByTeacherId(teacherId)`                                       | Returns the `course_id` for a teacher from `course_teachers`                                                                                                       |

### Phase 3 — Domain + Tests + Service

**`src/utils/enrolment/domain/enrolment.domain.ts`**

`deriveReviewHeading` — add `courseId: string | null` to assignment array type; change peer
lookup to use courseId key and filter out reviewer.

**`src/utils/enrolment/domain/enrolment.domain.test.ts`**

Update `deriveReviewHeading` tests:

- Add `courseId: 'c1'` to all `reviewerAssignments` entries
- Change `peersForReviewers` map key from `'r1'` (reviewerId) to `'c1'` (courseId)
- The map value for `'c1'` should include ALL course members including the reviewer, since
  filtering now happens inside `deriveReviewHeading`:
  `new Map([['c1', [{ id: 'r1', name: 'Alice Smith' }, { id: 'p1', name: 'Bob Jones' }]]])`

**`src/utils/enrolment/service/enrolment.service.ts`**

| Function                                                                              | Change                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| imports                                                                               | Remove `findPeerTeacherIds`; add `findReviewerAssignmentForEnrollment`, `findCourseTeamIds`, `findCourseIdsForViewer`, `findUnscoredAssignmentsByReviewer`, `insertCourseSubstitute`, `deleteCourseSubstituteByAbsentTeacher`, `findCourseIdByTeacherId` |
| `assertEvaluationAuthorized`                                                          | Use `findReviewerAssignmentForEnrollment(enrollmentId)` → `{reviewerId, courseId}`; check authorization via `findCourseTeamIds(courseId)`                                                                                                                |
| `setEvaluationScoreWithAccess`                                                        | Same: use `findReviewerAssignmentForEnrollment` + `findCourseTeamIds`                                                                                                                                                                                    |
| `persistDerivedEvaluationStatus`                                                      | `peerIds = (await findCourseTeamIds(courseId)).filter(id => id !== reviewerId)`                                                                                                                                                                          |
| `getEnrollmentsService`                                                               | Replace `findPeerTeacherIds(userId)` → `findCourseIdsForViewer(userId)`; pass `viewerCourseIds` to `findEnrollmentsPage`; update `findPeersForReviewers` call to pass unique course IDs                                                                  |
| `distributeEnrollmentsService`                                                        | After building assignments via `buildEnrollmentAssignments`, enrich each with `courseId` from reviewer's `course_teachers` entry; pass to `bulkAssignEnrollments`                                                                                        |
| **NEW** `substituteTeacherService(absentTeacherId, substituteTeacherId, adminUserId)` | Atomic substitution — see design above                                                                                                                                                                                                                   |
| **NEW** `endSubstitutionService(absentTeacherId, adminUserId)`                        | Deletes `course_substitutes` row                                                                                                                                                                                                                         |

### Phase 4 — Admin UI

New admin action for "Substitute teacher":

- Select absent teacher → select substitute teacher → confirm (shows count of enrollments to be reassigned)
- Calls `substituteTeacherService`
- "End substitution" button calls `endSubstitutionService`
- Suggested location: alongside the existing "Distribute unassigned" action on the
  enrollments admin page
- Reference `src/components/dialog/CourseDialog.tsx` for dialog patterns

### Phase 5 — Documentation

**`CONTEXT.md`** — add after "Peer-review state" entry:

> **Course Substitute**
> A Teacher-user temporarily covering another teacher's Reviewer assignments and Peer Review
> responsibilities for a specific course. Recorded in `course_substitutes`
> (`substitute_teacher_id`, `absent_teacher_id`, `course_id`). The substitute appears as a
> full member of the course's review team — for peer queue, peer-review state derivation,
> and authorization — without being added to `course_teachers`. Created and removed by an
> Admin. Constraints: one substitution per (substitute, course); one substitute per
> (absent teacher, course).

**`docs/adr/0007-peer-review-via-course-partner-cross-evaluation.md`** — add at top:

> **Rev 2 (2026-06-16):** `course_teachers.teacher_id` is now uniquely constrained at DB
> level (`uniqueIndex`), enforcing the "one course per teacher" convention stated here as
> unenforced. The `course_substitutes` table handles temporary multi-course membership
> (Teacher Substitution) without violating this constraint.

---

## Critical Invariants — Do Not Break

1. `enrollment_evaluations` — attribution is per `(enrollment, evaluator)`. Never reassign
   or delete existing evaluation rows; they stay with the actual evaluator regardless of
   Reviewer changes.
2. `deriveEnrollmentStatus` (ADR 0008) — only the assigned Reviewer's score drives status.
   The peer set for `peerHasScored` must be scoped to `assignment.course_id`, not the
   reviewer's full course membership.
3. Status freeze set — `approved/withdrawn/deferred` are never overwritten by re-scoring.
4. `course_teachers.teacher_id` unique — after Phase 1, a teacher can only be on one course
   in `course_teachers`. Substitutes use `course_substitutes` instead.
5. Admin reviewers have no `course_teachers` entry — `course_id` stays `NULL` on their
   assignments. All peer lookups must handle `NULL` course_id gracefully (empty peers).

---

## Key Files to Read Before Starting

```
CONTEXT.md
docs/adr/0007-peer-review-via-course-partner-cross-evaluation.md
docs/adr/0008-auto-status-from-reviewer-score.md
src/db/schema/course.schema.ts
src/db/schema/enrollment.schema.ts
src/utils/enrolment/repository/enrolment.repository.ts
src/utils/enrolment/service/enrolment.service.ts
src/utils/enrolment/domain/enrolment.domain.ts
src/utils/enrolment/domain/enrolment.domain.test.ts
```

---

## Suggested Skills

- **`tdd`** — invoke before writing repository functions and service changes. Write failing
  tests first, especially for `findCourseTeamIds`, `findCourseIdsForViewer`, and the peer
  queue changes in `findEnrollmentsPage`.
- **`reviewing-code`** — run before committing Phase 2+3 changes to catch authz edge cases.
- **`stack-planner`** — once implementation is complete, use to split into a clean PR stack:
  schema migration → repository → service+domain → UI → docs.
- **`grill-with-docs`** — if any ambiguity arises about the substitution UI design or
  the admin workflow for ending a substitution.
