# ADR 0017 — Timed Exam Attempt Integrity

**Status:** Accepted
**Date:** 2026-07-05

## Context

The portal needs timed exams: a teacher/admin authors an exam with a start window
(`opensAt`–`closesAt`), a student starts it once and gets a fixed duration (default 30
minutes). The timer must survive tab closes and reconnects, students must not be able to
extend it from the client, correct answers must never reach the student, and the app runs
on Cloudflare Workers, so there is no long-lived process or cron to close out expired
attempts.

## Decision

1. **Server-authoritative, denormalized deadline.** `startAttempt` writes
   `deadlineAt = startedAt + durationMinutes` onto the attempt row. All timing checks
   compare `new Date()` on the server against that stored value; the client countdown
   (`useExamCountdown`) is display-only and corrects clock skew from a `serverNow`
   returned with the taking payload. Later exam edits can never move a live deadline.
2. **Per-answer upsert is the durable state of record.** Every answer change is upserted
   server-side keyed by unique `(attemptId, questionId)`. There is no client-held draft:
   closing the tab loses nothing, and at the deadline the saved answers simply *are* the
   submission.
3. **30-second late-save grace.** Saves and submits are accepted until
   `deadlineAt + SAVE_GRACE_MS` (30 s) to absorb network latency on the final autosave;
   after that they are rejected with a typed `ValidationError`.
4. **Lazy finalization, no cron.** Any server path that touches an attempt (resume read,
   save, submit, grading list) first finalizes it if expired: auto-grade multiple-choice
   answers and flip `in_progress → submitted` with `submittedAt = deadlineAt`. The flip is
   a conditional `UPDATE … WHERE status = 'in_progress'` returning the row, so concurrent
   finalizers race safely — exactly one wins, losers re-read. Nothing depends on the flip
   happening before someone reads the row, which is what makes cron unnecessary.
5. **Correct-answer secrecy via server projection.** Student-facing payloads are built
   through redaction domain functions that strip `isCorrect` from options and hide
   scores/per-answer correctness until the attempt is `graded` (same pattern as the
   Redacted Enrollment View). RLS on the exam tables is a backstop, not the boundary —
   Postgres RLS cannot hide columns. An integration test deep-asserts no `isCorrect` key
   anywhere in student payloads.
6. **Single attempt by unique constraint.** `exam_attempts` is unique on
   `(examId, studentId)`; `startAttempt` inserts with `onConflictDoNothing` and falls back
   to the existing row, so concurrent double-starts resume the same attempt instead of
   creating two.

Timestamps follow the repo-wide `timestamp` (without timezone) convention; all
comparisons happen in server code via `new Date()`.

## Consequences

- Students can close and reopen the tab freely; the deadline and their answers are intact
  because both live server-side.
- An expired attempt may sit as `in_progress` in the database until the next read touches
  it; consumers must treat `finalizeIfExpired` as part of every attempt read path (the
  service layer already does).
- A student who lets the timer run out still gets their saved answers submitted and
  MC-auto-graded, with `submittedAt = deadlineAt` regardless of when finalization runs.
- Extending `closesAt` after publish is safe for live attempts because deadlines are
  denormalized per attempt.
- Randomization, multiple attempts, and course scoping are deferred; the schema admits
  them without breaking changes.
