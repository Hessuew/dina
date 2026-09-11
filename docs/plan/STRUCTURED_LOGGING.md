# Structured Logging

**Status:** In progress

## Target Shape

Server-side operational logs should be JSON objects with:

- `level`: `info`, `warn`, or `error`.
- `event`: stable event name.
- `requestId`: `cf-ray`, `x-request-id`, or generated UUID.
- `route` or `path`: route/action name when available.
- `userId`: only when authenticated and safe.
- `status`: outcome category.
- `durationMs`: elapsed time for the operation.
- `errorCategory`: stable category for failures.

## Redaction Rules

Never log passwords, tokens, cookies, Supabase service-role keys, connection strings, raw request bodies, or raw exception messages that may contain secrets. Prefer stable categories and IDs that let the team pivot into Better Stack or Cloudflare logs.

## Rollout

1. Keep the health/readiness logs as the first canonical example. **Done:**
   both endpoints now use `src/utils/observability/logger.ts`.
2. Add a shared server logging helper before replacing broad `console.error` and `console.warn` usage. **Done:**
   the helper emits stable JSON and recursively redacts sensitive fields and
   raw error messages.
3. Convert high-value server functions first: auth, enrollment, assignment submission, teacher review, admin workflows. **In progress:** assignment submission persistence now emits redacted `assignment_submission_saved` and `assignment_submission_failed` events with request correlation, outcome status, duration, and stable error category fields. Assignment grading now emits a redacted `assignment_grading_completed` event with request correlation, status, duration, assignment, submission, and actor identifiers. Signup and OTP flows now emit the same shape for OTP delivery, account provisioning, rollback, auto-login, and resend outcomes. The admin invitation-email campaign now emits redacted per-invitation delivery outcomes, campaign summaries, and lock-release failures. Password-reset email delivery and password update outcomes now emit redacted success/failure events with stable categories and provider codes. Enrollment evaluation score, admission-category, and note mutations now emit a shared redacted `enrollment_evaluation_updated` event with request correlation, evaluator/enrollment IDs, action path, status, duration, and field type; evaluation values and note text are excluded. Avatar and course-thumbnail upload actions now emit request-correlated completion/failure events, while storage URL-signing and old-object cleanup failures use redacted warning events. Student exam submission now emits `exam_attempt_submitted`, `exam_attempt_submission_ignored`, and unexpected `exam_attempt_submission_failed` events with request correlation, attempt/exam/student IDs, outcome status, duration, submission mode, and stable error categories; answers and scores are excluded. The admin WhatsApp campaign now emits redacted per-message delivery outcomes, completion summaries with safe flattened skip counters, and lock-release failures; recipient phone/name data and provider exception text are excluded from structured telemetry. Post/comment notification persistence now emits a redacted `notification_delivery_failed` event with request correlation, notification type, recipient count, duration, and a stable error category while preserving best-effort delivery semantics.
   Student attendance check-in now emits redacted
   `attendance_check_in_completed` and `attendance_check_in_ignored` events
   with request correlation, course/session/lesson/student IDs, status, and
   duration; unexpected persistence failures emit
   `attendance_check_in_failed` with a stable error category. Closed-window
   validation remains an expected user-facing outcome.
   Profile updates and email-change verification now emit redacted
   `profile_updated`, `email_change_requested`, `email_change_completed`, and
   failure events with request correlation, user ID, status, duration, and
   stable persistence/provider categories; email addresses, verification
   tokens, and provider messages are excluded.
   Admin staff-privilege grants and revokes now emit redacted
   `staff_privilege_updated` audit events with request correlation, actor and
   target IDs, privilege, grant direction, status, and duration; persistence
   failures use `staff_privilege_update_failed` with a stable category.
   Admin invitation creation and resend now emit redacted
   `invitation_created` / `invitation_resent` events and stable delivery or
   persistence failures; revoke and delete emit audit events. Actor and
   invitation IDs plus role are safe fields, while email addresses, tokens,
   and provider messages are excluded.
   Course-teacher lesson authoring now emits redacted
   `lesson_created`, `lesson_updated`, and `lesson_deleted` events with
   request correlation, server-function path, actor/course/lesson IDs,
   status, and duration; persistence failures use the stable
   `lesson_persistence` category.
   Course management now emits redacted `course_created`, `course_updated`,
   and `course_deleted` events with request correlation, server-function path,
   actor/course IDs, publication status where relevant, and duration;
   unexpected persistence failures use the stable `course_persistence`
   category while expected authorization, validation, and teacher-conflict
   outcomes remain out of noisy error logs.
   The direct Admin course-teacher assignment mutation now emits a redacted
   `course_teachers_updated` event with request correlation, actor/course/
   teacher IDs, status, and duration; unexpected replacement failures use the
   stable `course_teacher_assignment_persistence` category while expected
   authorization, validation, conflict, and not-found outcomes remain out of
   noisy error logs.
   Discipleship assignment, pairing, and schedule mutations now emit shared
   `discipleship_mutation_completed` / `discipleship_mutation_failed` events
   with request correlation, action path, actor and safe student/teacher/pair
   IDs, operation type, status, and duration; schedule timestamps and raw
   persistence details are excluded, and expected authorization, not-found,
   and pairing-conflict outcomes remain out of noisy error logs.
   Calendar event create, update, and delete mutations now emit redacted
   `calendar_event_created`, `calendar_event_updated`, and
   `calendar_event_deleted` events with request correlation, actor/event/course
   IDs, category, status, and duration. Unexpected persistence failures use
   the stable `calendar_event_persistence` category; titles, descriptions,
   locations, meeting links, and timestamps remain excluded.
   Post and comment create, update, and delete mutations now emit redacted
   `post_created`, `post_updated`, `post_deleted`, `comment_created`,
   `comment_updated`, and `comment_deleted` events with request correlation,
   actor/post/comment/course IDs, status, and duration. Unexpected persistence
   failures use `post_persistence` or `comment_persistence`; post and comment
   content remains excluded.
   Post and comment reaction toggles now emit redacted
   `post_reaction_toggled` / `comment_reaction_toggled` events with request
   correlation, actor/target IDs, reaction action, emoji, status, and duration.
   Unexpected reaction persistence failures use stable
   `post_reaction_persistence` or `comment_reaction_persistence` categories.
   Post-notification group and mark-all read-state mutations now emit redacted
   `notification_group_marked_read` / `notifications_marked_read` events with
   request correlation, actor/target metadata, scope, status, and duration.
   Unexpected read-state persistence failures use the stable
   `notification_read_state_persistence` category; notification content and
   raw database details remain excluded.
   Admin Zoom-link create, update, and delete mutations now emit redacted
   `zoom_link_created`, `zoom_link_updated`, and `zoom_link_deleted` events
   with request correlation, actor/link IDs, section, teacher ownership,
   status, and duration. Zoom URLs, meeting IDs, passcodes, titles, and raw
   persistence details remain excluded; unexpected repository failures use
   the stable `zoom_link_persistence` category.
   Media-library create, update, and delete mutations now emit redacted
   `media_created`, `media_updated`, and `media_deleted` events with request
   correlation, actor/media IDs, media kind, course ID where applicable,
   status, and duration. Media titles, descriptions, external URLs, private
   storage paths, and raw persistence details remain excluded; unexpected
   failures use the stable `media_persistence` category.
   Exam create, save, and publish mutations now emit redacted
   `exam_created`, `exam_updated`, and `exam_published` events with request
   correlation, actor/exam IDs, exam status, safe question counters, and
   duration. Exam titles, dates, question prompts, option labels, and raw
   persistence details remain excluded; unexpected failures use the stable
   `exam_persistence` category.
4. Keep expected user-input failures out of noisy error logs.

The next migration should target one high-value server-function family at a
time and provide stable `event`, `requestId`, `status`, and `durationMs`
fields. Do not pass raw exception messages or request bodies to the logger.
