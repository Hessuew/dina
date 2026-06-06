# ADR 0008: Auto-derive Enrollment Status from the Reviewer's Evaluation Score

**Status:** Accepted  
**Date:** 2026-06-06  
**Supersedes:** the "scoring is independent of enrollment status" decision in ADR 0006, and the "peer-review state and status are orthogonal, status stays admin-controlled" framing in ADR 0007 (only insofar as status is now also written by the system).

## Context

ADR 0006 deliberately kept Enrollment Evaluation **side-effect-free**: scoring never touched `enrollments.status`, and an admin moved every applicant through the pipeline by hand (the alternative *"Couple evaluation to status"* was explicitly rejected). ADR 0007 reaffirmed this, treating peer-review state and status as orthogonal axes.

In practice this left admins doing mechanical work: a Reviewer scores an applicant 0, and an admin then has to separately mark the enrollment `rejected`. We want the Reviewer's verdict to move the enrollment automatically and reserve admin attention for the high-stakes admits.

## Decision

The **assigned Reviewer's** evaluation score now drives `enrollments.status` automatically.

- **Driver** — only the score of the enrollment's assigned Reviewer (`enrollment_reviewer_assignments`) changes status. Peer reviewers and admins who are not the assigned Reviewer remain **advisory** — their scores never move status. Enrollments with no assigned Reviewer get no auto-status.
- **Mapping** — `0/1 → rejected`, `2 → waitlisted`, `3/4 → awaiting_approval`, cleared score (`null`) `→ under_review`. The rubric score **labels are unchanged** (`1` is still shown as "Borderline" to evaluators); only the status derivation treats `1` as a reject.
- **New status `awaiting_approval`** — a pre-approval stage meaning "evaluation done, waiting on the admin's final call". The admin then moves it to `approved`/`rejected`, and the existing rule stands: invitations are only offered once status is `approved`.
- **Freeze set** — auto-status owns `{pending, under_review, rejected, waitlisted, awaiting_approval}`. When the current status is an admin lifecycle decision — `approved`, `withdrawn`, `deferred` — re-scoring does **nothing**. The admin's final word is sticky.
- **Mechanism** — a pure domain helper `deriveEnrollmentStatusFromReviewerScore(score, currentStatus)` (unit-tested, colocated per ADR 0004) returns the next status or `null` (no change). `setEvaluationScore` applies it after the upsert, gated on `evaluatorId === reviewerId`. The write is feasible without RLS changes because `getDb()` is a direct Postgres connection (via `DATABASE_URL`) that bypasses RLS — the app-level `authz`/`resolveAdminOrTeacherAccess` checks are the real gate, so a teacher's server-fn call can write `enrollments.status`.

## Alternatives Considered

- **Keep status admin-only (status quo, ADR 0006)** — rejected; that mechanical work is exactly what we want to remove.
- **Aggregate / average all evaluator scores** — rejected; a single low peer score could silently flip an admit, and the value is hard to reason about. The assigned Reviewer is the canonical owner.
- **Both Reviewer and Peer must agree before high status** — rejected as too strict; peer disagreement on a 3/4 is precisely the case `awaiting_approval` surfaces for an admin to judge.
- **Reuse `under_review` instead of a new `awaiting_approval`** — rejected; `under_review` reads as "still being reviewed", muddying the distinct "evaluation done, waiting on admin" meaning.
- **Auto-status always overwrites (no freeze set)** — rejected; it could silently undo an admin's `approved`/`withdrawn`/`deferred` decision.

## Consequences

- New `enrollment_status` value `awaiting_approval` (migration `drizzle/0026_*`, `ALTER TYPE ... ADD VALUE 'awaiting_approval' BEFORE 'approved'`). Surfaced in `EnrollmentStatusChip`, the admin `STATUS_OPTIONS`, and `updateEnrollmentStatusSchema`.
- New domain helper `deriveEnrollmentStatusFromReviewerScore` + tests; new repository helper `findReviewerIdForEnrollment`; `setEvaluationScore` gains the auto-status write.
- Status is no longer purely admin-authored. The freeze set keeps admin terminal decisions authoritative, but a Reviewer changing their score can now move a non-frozen enrollment. This reverses the side-effect-free guarantee of ADR 0006.
- The peer-review queue and the `awaiting_approval` stage now align: a Reviewer's 3/4 both opens peer review (ADR 0007) and parks the enrollment at `awaiting_approval` for the admin.
