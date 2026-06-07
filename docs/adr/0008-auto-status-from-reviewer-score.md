# ADR 0008: Auto-derive Enrollment Status from the Reviewer's Evaluation Score

**Status:** Accepted (rev 1 — updated 2026-06-07)
**Date:** 2026-06-06  
**Supersedes:** the "scoring is independent of enrollment status" decision in ADR 0006, and the "peer-review state and status are orthogonal, status stays admin-controlled" framing in ADR 0007 (only insofar as status is now also written by the system).

## Context

ADR 0006 deliberately kept Enrollment Evaluation **side-effect-free**: scoring never touched `enrollments.status`, and an admin moved every applicant through the pipeline by hand (the alternative _"Couple evaluation to status"_ was explicitly rejected). ADR 0007 reaffirmed this, treating peer-review state and status as orthogonal axes.

In practice this left admins doing mechanical work: a Reviewer scores an applicant 0, and an admin then has to separately mark the enrollment `rejected`. We want the Reviewer's verdict to move the enrollment automatically and reserve admin attention for the high-stakes admits.

**Rev 1 (2026-06-07):** The original decision mapped a cleared Reviewer score (`null`) to `under_review`, treating that status as "not yet evaluated". After shipping the Review heading column (which surfaces individual reviewer/peer evaluation state directly in the table), the `under_review` status was given a more precise meaning: "Reviewer has scored 3/4, Peer has not yet cross-evaluated." See the updated mapping below.

## Decision

The **assigned Reviewer's** evaluation score, combined with whether the Reviewer's **Peer** has also evaluated, now drives `enrollments.status` automatically.

- **Driver** — only the score of the enrollment's assigned Reviewer (`enrollment_reviewer_assignments`) changes status. Peer reviewers and admins who are not the assigned Reviewer are taken into account for the `under_review`/`awaiting_approval` transition but otherwise remain **advisory**. Enrollments with no assigned Reviewer get no auto-status.
- **Mapping (rev 1)**:
  - Cleared score (`null`) → `pending` (reviewer has not scored; enrollment is back in the unreviewed queue)
  - `0` / `1` → `rejected`
  - `2` → `waitlisted`
  - `3` / `4` AND Peer has **not** scored → `under_review` (high-stakes admit pending peer cross-check)
  - `3` / `4` AND Peer **has** scored → `awaiting_approval` (both reviewers done; admin makes the final call)
- **Peer scoring trigger** — when the enrolled Peer saves their score on an enrollment whose assigned Reviewer already holds a 3/4 score, the status moves between `under_review` and `awaiting_approval` accordingly. This is the only case where a non-Reviewer score directly affects status.
- **Freeze set** — auto-status owns `{pending, under_review, rejected, waitlisted, awaiting_approval}`. When the current status is an admin lifecycle decision — `approved`, `withdrawn`, `deferred` — re-scoring does **nothing**. The admin's final word is sticky.
- **Mechanism** — the pure domain helper `deriveEnrollmentStatus(score, peerHasScored, currentStatus)` (unit-tested, co-located per ADR 0004) returns the next status or `null` (no change). `setEvaluationScoreService` applies it after the upsert, fetching the reviewer's current score and whether any peer has scored, then calling `updateEnrollmentStatusById`. The write bypasses RLS via the direct Postgres connection (`DATABASE_URL`); app-level authz guards remain the real gate.

## Alternatives Considered

- **Keep status admin-only (status quo, ADR 0006)** — rejected; that mechanical work is exactly what we want to remove.
- **Aggregate / average all evaluator scores** — rejected; a single low peer score could silently flip an admit, and the value is hard to reason about. The assigned Reviewer is the canonical owner.
- **Both Reviewer and Peer must agree before high status** — rejected as too strict; peer disagreement on a 3/4 is precisely the case `awaiting_approval` surfaces for an admin to judge.
- **Reuse `under_review` for "reviewer hasn't scored" (original rev 0)** — revised in rev 1; the Review heading column now makes per-reviewer evaluation state visible directly in the table, freeing `under_review` to mean the more useful "peer cross-check pending" state.
- **Auto-status always overwrites (no freeze set)** — rejected; it could silently undo an admin's `approved`/`withdrawn`/`deferred` decision.

## Consequences

- `enrollment_status` value `awaiting_approval` (migration `drizzle/0026_*`). Surfaced in `EnrollmentStatusChip`, the admin `STATUS_OPTIONS`, and `updateEnrollmentStatusSchema`.
- `enrollment_status` value `under_review` now means "Reviewer scored 3/4, Peer has not yet cross-evaluated" (rev 1 semantic shift from the original "awaiting any review" meaning).
- `enrollment_status` value `pending` is the effective "reviewer hasn't scored" state (rev 1); a cleared Reviewer score returns the enrollment here.
- Domain helper renamed from `deriveEnrollmentStatusFromReviewerScore` to `deriveEnrollmentStatus(score, peerHasScored, currentStatus)` to reflect the additional peer-score input.
- Peer scoring now also triggers a status recompute (in addition to Reviewer scoring), so admins see `awaiting_approval` only once both evaluators are done.
- Status is no longer purely admin-authored. The freeze set keeps admin terminal decisions authoritative, but a Reviewer or Peer changing their score can now move a non-frozen enrollment. This reverses the side-effect-free guarantee of ADR 0006.
- The `under_review` and `awaiting_approval` stages align with the Review heading column: `under_review` corresponds visually to "Reviewer checked, Peer not yet"; `awaiting_approval` to "both checked, admin to decide".
