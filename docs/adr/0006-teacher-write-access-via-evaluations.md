# ADR 0006: Teachers Gain Write Access via Enrollment Evaluations

**Status:** Accepted  
**Date:** 2026-06-02

## Context

ADR 0005 relaxed enrollment access so teachers could **read** (redacted) submissions, while keeping every write path admin-only — teachers could not change status, send invitations, or delete. That read-only stance was deliberate: enrollment records are admin-managed.

Reviewing applicants was still slow and happened outside the app. Reviewers opened each submission, read it, went back, opened the next, and recorded scores + notes by hand into a shared external document. We want committee review to happen inside the app, keyboard-fast, with scores and notes captured per reviewer.

This requires teachers (and admins) to **write** review data. A reviewer's score and note are not part of the enrollment record — they are a separate, reviewer-owned artifact. So this does not reopen the admin-only enrollment record; it introduces a new, parallel entity that staff may write to.

## Decision

Introduce an **Enrollment Evaluation**: one row per `(enrollment, evaluator)` in a new `enrollment_evaluations` table, holding a nullable rubric `score` (0..4), a nullable `admission_category`, and an optional `note`. Both **teacher-users and admins** ("Evaluators") may create and update **their own** evaluation row; nobody can write another evaluator's row.

- **Score** is set via the review overlay (keyboard `0`-`4`; re-press/Backspace clears) and saved immediately. Meanings: 0 rejected, 1 borderline, 2 reserve list, 3 admission, 4 strong admission.
- **Admission category** is selected as A/B/C when score is 3 or 4: A new (admitted in the new young convert/new discipleship category), B emerging (admitted into emerging leaders discipleship category), C established (admitted into an established leaders discipleship category). The UI prompts for it without blocking navigation.
- **Note** autosaves (debounced ~400ms). All evaluators' non-empty notes are visible to all evaluators, attributed by author + score + category (shared committee context).
- Evaluation is **independent of enrollment status** — scoring never mutates `status`; admins still set status manually as before. _(**Superseded by ADR 0008**: the assigned Reviewer's score now auto-derives status.)_

RLS policies on `enrollment_evaluations` enforce the ownership rule (`evaluator_id = auth.uid()` for insert/update; staff-only select), mirroring how `posts`/`post_comments` are policed. App-level server functions (`setEvaluationScore`, `setEvaluationAdmissionCategory`, `setEvaluationNote`) additionally gate on `resolveAdminOrTeacherAccess` before the `upsert`, consistent with the rest of the enrollment server fns.

## Alternatives Considered

- **Admin-only evaluation** — rejected; teachers are part of the review committee and their input is the point of the feature.
- **A single shared score/note per enrollment** — rejected; loses attribution and lets one reviewer overwrite another's judgement.
- **Store score/note as columns on `enrollments`** — rejected; that would reopen write access to the admin-owned record (contradicting ADR 0005) and cannot hold per-reviewer values.
- **Couple evaluation to status (auto `under_review`)** — rejected to keep scoring side-effect-free and the status workflow under admin control.

## Consequences

- New `enrollment_evaluations` table (migration `drizzle/0022_*`, updated by `drizzle/0023_*`), with a `(enrollment_id, evaluator_id)` unique constraint, a `score BETWEEN 0 AND 4` check, and an admission-category check requiring category rows to remain tied to scores 3 or 4.
- New server fns `setEvaluationScore` / `setEvaluationAdmissionCategory` / `setEvaluationNote` (teacher-or-admin); `getEnrollments` now also returns per-row aggregates (`evaluationSum`, `evaluationCount`) and the page's evaluations, and supports sorting by `evaluationSum`.
- The enrollment list gains a sortable **Score** column (`sum · count`), and the row "View" action opens a keyboard-driven review **overlay** (carousel over the current filtered list) instead of the detail page. The detail page remains reachable from the overlay.
- The `BUSINESS_RULES.md` permission matrix should reflect a new capability: **Submit Enrollment Evaluation (teacher + admin)**. Teachers still cannot change status, invite, or delete — those remain admin-only per ADR 0005.
- This is the first teacher-writable surface in the enrollment domain; the read-only framing of ADR 0005 now applies to the enrollment **record**, not to evaluation artifacts.
