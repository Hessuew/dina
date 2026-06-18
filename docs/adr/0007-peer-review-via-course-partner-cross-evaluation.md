# ADR 0007: Peer Review via Course-Partner Cross-Evaluation

**Status:** Accepted  
**Date:** 2026-06-06

**Rev 1 (2026-06-10):** Teacher **View All** intentionally broadens visibility: any teacher may view enrollments whose assigned Reviewer scored 3+ (3/4), not only their course-partner peer queue. The default list remains assigned-to-me plus course-partner peer-review items.

**Rev 2:** Two schema changes enforce and extend the peer-review invariant:

1. **`course_teachers.teacher_id` unique constraint** (`course_teachers_teacher_id_unique` index) — enforces the "one course per teacher" rule at the DB level. Teachers are always uniquely associated with a single course.
2. **`course_substitutes` table** — records temporary substitutions where Teacher A covers Teacher B's Reviewer duties on Teacher B's course without being added to `course_teachers`. The substitute appears as a full team member for peer-review queue surfacing, evaluation authorization, and status derivation. The team is now resolved as the UNION of `course_teachers` + active `course_substitutes` for a course (`findCourseTeamIds`). All operations scope through `enrollment_reviewer_assignments.course_id` (the course namespace stamped on each assignment) instead of joining through the reviewer's live `course_teachers` row, making the team lookup stable even as substitutes change. See CONTEXT.md **Course Substitute**.

## Context

Teachers teach in pairs — two teachers share a course (`course_teachers`), each teacher on one course. We want a teacher to **peer-review** their partner's high-stakes admits: every enrollment the partner (the other teacher on their course) scored **3 or 4** should be cross-checked by the teacher, who records their own judgement.

Until now a teacher's enrollments list showed only the enrollments assigned to them as **Reviewer** (`enrollment_reviewer_assignments`, one reviewer per enrollment); a partner's admits were filtered out. We need those admits to surface, the act of reviewing them to be unmistakable in the UI, and the list to show at a glance where each one sits in the peer-review lifecycle (_under peer review → peer reviewed_).

ADR 0006 established that an Enrollment Evaluation is owned per `(enrollment, evaluator)`, that any teacher/admin may write only their own evaluation row, and that scoring is **independent of enrollment `status`** (scoring never mutates status; status stays admin-controlled). Peer review must not reopen that.

## Decision

Peer review is **cross-evaluation**, not a new entity:

- **Peer derivation** — a teacher's peers are the other teachers sharing their course, via a `course_teachers` self-join (`findPeerTeacherIds`). The "exactly two teachers per course" shape is a convention, **not** a DB constraint; all co-teachers count as peers and the system degrades gracefully (0 peers → behaviour unchanged; >2 → all count).
- **Reuse Enrollment Evaluation** — peer-reviewing means the teacher adds their **own** evaluation row (the existing score / admission category / note) to the partner's enrollment, becoming a second Evaluator. No new table, no new score type, no new write path or RLS (the existing `evaluator_id = auth.uid()` policies already allow it).
- **Widened list query** — for a teacher's default list, `findEnrollmentsPage` returns `assigned-to-me OR (a course partner scored this 3/4)`. Teacher **View All** drops the course-partner filter and returns every enrollment whose assigned Reviewer scored 3+ (3/4), so all teachers can inspect high-stakes reviewer admits. Admin **View All** remains unchanged (no filter).
- **Derived peer-review state** — a per-viewer label (`under_peer_review` / `peer_reviewed` / none) computed live by `derivePeerReviewState` from the page's evaluations + the viewer's peer ids. It is **not** stored and **not** an `enrollment_status` value. _(Peer scores remain advisory and never drive status; only the assigned Reviewer's score does — see **ADR 0008**, which auto-derives status from the Reviewer's score.)_
- **UI** — the list gains a non-sortable "Peer review" badge column; the review overlay relocates the other-evaluators' scores beneath the applicant's name, enlarged and gold, so the partner's score is obvious.

## Alternatives Considered

- **New `peer_reviews` table / separate verdict (agree·disagree)** — rejected; a peer's judgement _is_ an evaluation (score + category + note), so a parallel entity would duplicate the rubric and split attribution. Reusing Enrollment Evaluation keeps one source of truth and feeds the existing `sum · count` aggregate.
- **Add `under_peer_review` / `peer_reviewed` to the `enrollment_status` enum** — rejected. Peer-review state and the admin lifecycle are **orthogonal axes** (an enrollment can be both "approved" and "peer reviewed"); one column cannot hold both. Writing it would also reverse ADR 0006's side-effect-free, admin-only status rule. Deriving the state avoids a migration, avoids stale data, and preserves ADR 0006.
- **An explicit `teacher_pairs` table** — rejected for now; `course_teachers` already encodes the pairing. Revisit if pairing must diverge from course teaching.
- **Admin-curated peer-review assignments** — rejected; the pairing is mechanical (course partner), so manual curation is needless admin work.

## Consequences

- No schema migration. New repository helper `findPeerTeacherIds`; `findEnrollmentsPage` gains optional `peerIds` for the default peer queue and `requireReviewerAdmitted` for teacher **View All**; `getEnrollments` resolves peers and attaches derived review data to each row.
- New pure domain helper `derivePeerReviewState` (unit-tested, colocated per ADR 0004) and `PeerReviewState` type on `EnrollmentWithEvaluation`.
- New `PeerReviewChip` and a "Peer review" list column; overlay header restructured.
- **Risk:** the two-teachers-per-course convention is unenforced. The feature is correct for the convention and safe outside it, but a course with the wrong number of teachers produces a wider/narrower peer queue than intended. Add a DB constraint only if this becomes a real problem.
- Admins have no `course_teachers` row, so they have no peer queue; they continue to rely on **View All**.
- Teacher **View All** is broader than peer review by design: it exposes all enrollments with assigned Reviewer scores of 3+ (3/4) to all teachers while still redacting teacher-hidden enrollment fields.
