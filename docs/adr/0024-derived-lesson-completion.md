# ADR 0024 — Derived Lesson Completion

**Status:** Accepted
**Date:** 2026-09-17

## Context

Lesson completion was a manual student flag: a `Mark complete` button upserted
a `lesson_progress` row `(student_id, lesson_id, completed, completed_at)`.
Students could mark lessons complete without doing any work, and the stored flag
could drift from reality (re-grading, deleted or unpublished assignments, new
assignments added after completion).

The product rule is that completion follows grading: a lesson is done for a
student once the teaching staff has graded all of its assignments.

## Decision

1. **Completion is derived, not stored.** A Lesson is complete for a Student
   when it has at least one `published` Assignment and every published
   Assignment has a `submissions` row for that Student with
   `grade IS NOT NULL`. The predicate matches the existing convention that
   grading sets `grade`/`gradedAt` without writing `status = 'graded'`
   (`resolveSubmissionStatusVariant`).
2. **`lesson_progress` is dropped.** No stored progress table, no `completeLesson`
   server function, no student-facing completion control. The lesson page shows
   a passive status instead ("Completed" badge, or the grading condition).
3. **Zero-assignment lessons are never completable.** A content-only lesson
   shows no completion state; it also cannot block course-level completion
   signals because none exist anymore.
4. **`lesson_completed`/`course_completed` analytics are removed.** They were
   fired from the student's manual click; with no student action there is no
   client-side trigger.

## Alternatives considered

- **Stored flag written at grade time** (`gradeSubmissionService` upserts
  `lesson_progress` when the last published assignment is graded) — rejected.
  It drifts: un-publish/delete/new-assignment edge cases need repair logic,
  existing graded work needs a backfill, and a future un-grade path must
  remember to revoke the flag. The derived query is a single indexed join and
  always answers from the source of truth.
- **Vacuous completion for zero-assignment lessons** — rejected. "All zero
  assignments graded" would badge lessons the student never opened, which
  reads as a bug.

## Consequences

- Removing an assignment, un-publishing it, or adding a new published
  assignment automatically re-derives completion — no repair code.
- A student who never submitted stays incomplete forever; there is no
  grade-without-submission path.
- `completedAt` is gone; if needed later it is `MAX(submissions.graded_at)`
  over the lesson's published assignments.
- Grading never sets `status = 'graded'`; `buildAssignmentStats` and the
  assignments view count `status === 'graded'` and therefore undercount today.
  Tracked as a separate improvement item, out of this change's scope.
