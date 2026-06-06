# ADR 0007: Peer Review via Course-Partner Cross-Evaluation

**Status:** Accepted  
**Date:** 2026-06-06

## Context

Teachers teach in pairs — two teachers share a course (`course_teachers`), each teacher on one course. We want a teacher to **peer-review** their partner's high-stakes admits: every enrollment the partner (the other teacher on their course) scored **3 or 4** should be cross-checked by the teacher, who records their own judgement.

Until now a teacher's enrollments list showed only the enrollments assigned to them as **Reviewer** (`enrollment_reviewer_assignments`, one reviewer per enrollment); a partner's admits were filtered out. We need those admits to surface, the act of reviewing them to be unmistakable in the UI, and the list to show at a glance where each one sits in the peer-review lifecycle (_under peer review → peer reviewed_).

ADR 0006 established that an Enrollment Evaluation is owned per `(enrollment, evaluator)`, that any teacher/admin may write only their own evaluation row, and that scoring is **independent of enrollment `status`** (scoring never mutates status; status stays admin-controlled). Peer review must not reopen that.

## Decision

Peer review is **cross-evaluation**, not a new entity:

- **Peer derivation** — a teacher's peers are the other teachers sharing their course, via a `course_teachers` self-join (`findPeerTeacherIds`). The "exactly two teachers per course" shape is a convention, **not** a DB constraint; all co-teachers count as peers and the system degrades gracefully (0 peers → behaviour unchanged; >2 → all count).
- **Reuse Enrollment Evaluation** — peer-reviewing means the teacher adds their **own** evaluation row (the existing score / admission category / note) to the partner's enrollment, becoming a second Evaluator. No new table, no new score type, no new write path or RLS (the existing `evaluator_id = auth.uid()` policies already allow it).
- **Widened list query** — for a teacher, `findEnrollmentsPage` now returns `assigned-to-me OR (a peer scored this 3/4)`. Admin **View All** is unchanged (no filter).
- **Derived peer-review state** — a per-viewer label (`under_peer_review` / `peer_reviewed` / none) computed live by `derivePeerReviewState` from the page's evaluations + the viewer's peer ids. It is **not** stored and **not** an `enrollment_status` value.
- **UI** — the list gains a non-sortable "Peer review" badge column; the review overlay relocates the other-evaluators' scores beneath the applicant's name, enlarged and gold, so the partner's score is obvious.

## Alternatives Considered

- **New `peer_reviews` table / separate verdict (agree·disagree)** — rejected; a peer's judgement _is_ an evaluation (score + category + note), so a parallel entity would duplicate the rubric and split attribution. Reusing Enrollment Evaluation keeps one source of truth and feeds the existing `sum · count` aggregate.
- **Add `under_peer_review` / `peer_reviewed` to the `enrollment_status` enum** — rejected. Peer-review state and the admin lifecycle are **orthogonal axes** (an enrollment can be both "approved" and "peer reviewed"); one column cannot hold both. Writing it would also reverse ADR 0006's side-effect-free, admin-only status rule. Deriving the state avoids a migration, avoids stale data, and preserves ADR 0006.
- **An explicit `teacher_pairs` table** — rejected for now; `course_teachers` already encodes the pairing. Revisit if pairing must diverge from course teaching.
- **Admin-curated peer-review assignments** — rejected; the pairing is mechanical (course partner), so manual curation is needless admin work.

## Consequences

- No schema migration. New repository helper `findPeerTeacherIds`; `findEnrollmentsPage` gains an optional `peerIds` and an OR'd peer condition; `getEnrollments` resolves peers and attaches a derived `peerReviewState` to each row.
- New pure domain helper `derivePeerReviewState` (unit-tested, colocated per ADR 0004) and `PeerReviewState` type on `EnrollmentWithEvaluation`.
- New `PeerReviewChip` and a "Peer review" list column; overlay header restructured.
- **Risk:** the two-teachers-per-course convention is unenforced. The feature is correct for the convention and safe outside it, but a course with the wrong number of teachers produces a wider/narrower peer queue than intended. Add a DB constraint only if this becomes a real problem.
- Admins have no `course_teachers` row, so they have no peer queue; they continue to rely on **View All**.
