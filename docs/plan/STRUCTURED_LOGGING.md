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
   Course attendance state and student open-session reads now emit redacted
   `attendance_state_loaded` / `attendance_state_load_failed` and
   `attendance_open_sessions_loaded` / `attendance_open_sessions_load_failed`
   events with request correlation, actor/course IDs, role, safe session and
   lesson counts, open-session flags, and duration. Attendance titles,
   timestamps, and raw persistence details remain excluded; unexpected read
   failures use the stable `attendance_read_persistence` category.
   Profile updates and email-change verification now emit redacted
   `profile_updated`, `email_change_requested`, `email_change_completed`, and
   failure events with request correlation, user ID, status, duration, and
   stable persistence/provider categories; email addresses, verification
   tokens, and provider messages are excluded.
   Admin enrollment status, special-case, and deletion mutations now emit
   redacted `enrollment_status_updated`,
   `enrollment_special_case_updated`, and `enrollment_deleted` events with
   request correlation, server-function path, actor/enrollment IDs, safe
   outcome metadata, and duration. Unexpected persistence failures use stable
   `enrollment_status_persistence`, `enrollment_special_case_persistence`, or
   `enrollment_delete_persistence` categories; enrollment content and raw
   database details remain excluded.
   Attendance session open/re-open, close, and teacher/admin student overrides
   now emit redacted `attendance_session_opened`,
   `attendance_session_closed`, and `attendance_override_updated` events with
   request correlation, actor/course/lesson metadata, target student IDs where
   applicable, outcome status, and duration. Unexpected attendance persistence
   failures use stable `attendance_session_open_persistence`,
   `attendance_session_close_persistence`, or
   `attendance_override_persistence` categories; attendance timestamps and
   raw database details remain excluded.
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
   Course list and detail reads now emit redacted `course_read_loaded` and
   `course_read_failed` events with request correlation, actor/course IDs,
   role, safe course/lesson/media counts, status, and duration. Course titles,
   lesson content, media metadata, teacher payloads, and storage URLs remain
   excluded; expected authorization and not-found outcomes remain outside
   noisy error logs.
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
   Calendar event-management list reads now emit redacted
   `calendar_event_list_loaded` / `calendar_event_list_load_failed` events
   with request correlation, actor ID, safe total/linked counts, status, and
   duration. Event content, locations, meeting links, timestamps, and raw
   persistence details remain excluded; unexpected failures use the stable
   `calendar_event_read_persistence` category.
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
   Notification summary reads now emit redacted
   `notification_summary_loaded` / `notification_summary_load_failed` events
   with request correlation, actor ID, requested limit, safe group counts,
   status, and duration. Notification content, post excerpts, author details,
   and raw persistence details remain excluded; unexpected read failures use
   the stable `notification_summary_read_persistence` category.
   Admin Zoom-link create, update, and delete mutations now emit redacted
   `zoom_link_created`, `zoom_link_updated`, and `zoom_link_deleted` events
   with request correlation, actor/link IDs, section, teacher ownership,
   status, and duration. Zoom URLs, meeting IDs, passcodes, titles, and raw
   persistence details remain excluded; unexpected repository failures use
   the stable `zoom_link_persistence` category.
   Zoom-link list reads now emit redacted `zoom_links_loaded` /
   `zoom_links_load_failed` events with request correlation, actor ID, viewer
   role, safe link and teacher-option counts, status, and duration. Titles,
   descriptions, meeting URLs, meeting IDs, passcodes, and raw persistence
   details remain excluded; unexpected failures use the stable
   `zoom_links_read_persistence` category.
   Dashboard upcoming-lesson reads now emit redacted
   `upcoming_lessons_loaded` / `upcoming_lessons_load_failed` events with
   request correlation, actor ID, safe lesson counts, status, duration, and
   the stable `upcoming_lessons_read_persistence` failure category. Lesson
   titles, course names, content, and thumbnail URLs remain outside telemetry.
   Media-library create, update, and delete mutations now emit redacted
   `media_created`, `media_updated`, and `media_deleted` events with request
   correlation, actor/media IDs, media kind, course ID where applicable,
   status, and duration. Media titles, descriptions, external URLs, private
   storage paths, and raw persistence details remain excluded; unexpected
   failures use the stable `media_persistence` category.
   Thumbnail-upload completion now emits redacted `media_thumbnail_uploaded`
   and `media_thumbnail_upload_failed` events with actor/media IDs, replacement
   and signing outcomes, request correlation, status, duration, and the stable
   `media_thumbnail_persistence` failure category; thumbnail paths and provider
   error text remain excluded.
   Exam create, save, and publish mutations now emit redacted
   `exam_created`, `exam_updated`, and `exam_published` events with request
   correlation, actor/exam IDs, exam status, safe question counters, and
   duration. Exam titles, dates, question prompts, option labels, and raw
   persistence details remain excluded; unexpected failures use the stable
   `exam_persistence` category.
   Student exam-taking start/resume and answer-save mutations now emit
   redacted `exam_attempt_started`, `exam_attempt_resumed`, and
   `exam_answer_saved` events with request correlation, server-function path,
   student/attempt/exam IDs, attempt/question status, question type, and
   duration. Selected option IDs, answer text, and raw persistence details
   remain excluded; unexpected failures use stable
   `exam_attempt_persistence` or `exam_answer_persistence` categories.
   Teacher exam grading now emits redacted `exam_open_answer_graded` and
   `exam_grading_finalized` events with request correlation, server-function
   path, grader/attempt/exam IDs, answer or question IDs where applicable,
   question type, status, and duration. Awarded points, aggregate scores,
   answer text, and raw persistence details remain excluded; unexpected
   failures use the stable `exam_grading_persistence` category.
   Exam author/catalog and attempt reads now emit redacted
   `exam_read_loaded` / `exam_read_failed` events with request correlation,
   actor/exam/attempt IDs, role, safe result counts, status, and duration.
   Exam titles, question prompts, option labels, answers, scores, and raw
   persistence details remain excluded; unexpected failures use the stable
   `exam_read_persistence` category.
   Assignment create, update, and delete mutations now emit redacted
   `assignment_created`, `assignment_updated`, and `assignment_deleted` events
   with request correlation, server-function path, actor/course/lesson/
   assignment IDs, safe assignment status, and duration. Assignment titles,
   descriptions, due dates, and raw persistence details remain excluded;
   unexpected failures use the stable `assignment_persistence` category.
   Enrollment distribution and teacher substitution mutations now emit
   redacted completion events with request correlation, actor and safe
   teacher/course identifiers, assignment/reassignment counters, and duration.
   Unexpected repository failures use stable
   `enrollment_distribution_persistence`,
   `enrollment_substitution_persistence`, and
   `enrollment_substitution_end_persistence` categories; applicant content and
   raw database details remain excluded.
   Bulk enrollment grading now emits redacted
   `enrollment_bulk_grade_completed` events for preview and execute paths with
   request correlation, actor ID, thresholds, safe outcome counters, and
   duration. Read and update failures emit
   `enrollment_bulk_grade_failed` with stable
   `enrollment_bulk_grade_read_persistence` or
   `enrollment_bulk_grade_update_persistence` categories; enrollment
   identifiers and raw database details remain excluded.
   Password sign-in now emits redacted `login_succeeded` and `login_failed`
   events with request correlation, outcome, duration, a safe user ID on
   success, and a stable auth error category/provider code on rejection;
   email, password, and provider messages remain excluded.
   Password sign-out now emits redacted `logout_succeeded` and `logout_failed`
   events with request correlation, outcome, duration, and a stable
   `auth_sign_out` category/provider code; provider messages remain excluded.
   Authenticated profile password changes now emit redacted `password_updated`
   and `password_update_failed` events with request correlation, user ID,
   outcome, duration, stable `password_update` error categorization, and
   provider code when available; password values and provider messages remain
   excluded.
   Public enrollment persistence now emits redacted `enrollment_created` and
   `enrollment_create_failed` events with request correlation,
   `serverFn:createEnrollment`, the stable `public_enrollment_form` source,
   status, duration, and the generated enrollment ID on success. Applicant
   identity, contact details, application responses, and raw persistence
   errors remain excluded; the existing enrollment-closed behavior is
   unchanged.
   Manual Admin invitation sends from an enrollment now emit redacted
   `enrollment_invitation_sent` and `enrollment_invitation_failed` events with
   request correlation, `serverFn:sendInvitationForEnrollment`, actor/
   enrollment/invitation IDs where available, `new` or `resend` mode, status,
   duration, and stable delivery or persistence categories. Recipient email
   addresses, invitation tokens, provider errors, and expected user-facing
   authorization/conflict/not-found outcomes remain excluded.
   Student completion of published lessons now persists through an idempotent
   progress upsert and emits redacted `lesson_completed` on first completion,
   `lesson_completion_ignored` on repeat requests, and
   `lesson_completion_failed` for unexpected persistence errors. Events carry
   request correlation, actor/course/lesson IDs, status, duration,
   `courseCompleted`, and stable persistence categories; lesson content remains
   excluded. The course-completion flag is true only for the request that
   completes the final published lesson.
   Calendar overview reads now emit redacted `calendar_events_loaded` events
   with request correlation, actor ID, source counts, total event count,
   status, and duration. Unexpected read failures emit
   `calendar_events_load_failed` with the stable
   `calendar_read_persistence` category; calendar titles, descriptions,
   locations, links, and timestamps remain excluded.
   Student-directory list and detail reads now emit redacted
   `student_directory_loaded` / `student_directory_load_failed` events with
   request correlation, actor and target IDs where applicable, safe result
   counts, duration, and the stable `student_directory_read_persistence`
   failure category; names, emails, bios, and assignment content remain
   excluded.
   Teacher-directory list reads now emit redacted
   `teacher_directory_loaded` / `teacher_directory_load_failed` events with
   request correlation, actor ID, safe result counts, duration, and the stable
   `teacher_directory_read_persistence` failure category; teacher names,
   emails, bios, and privilege details remain excluded.
   Assignment lesson/detail, student/teacher list, submission-count, and
   submission-list reads now emit redacted `assignment_read_loaded` /
   `assignment_read_failed` events with request correlation, actor IDs, safe
   lesson/assignment IDs, role/scope, publication/status metadata, and result
   counts. Assignment titles, lesson content, student identity, submission
   text, grades, feedback, and raw persistence details remain excluded;
   unexpected failures use the stable `assignment_read_persistence` category
   while expected authorization and not-found outcomes remain quiet.
   Library media list/detail reads now emit redacted
   `library_media_loaded` / `library_media_load_failed` events with request
   correlation, actor/media IDs, role, safe result counts, publication and
   permission flags, file type, status, and duration. Media titles,
   descriptions, external URLs, private storage paths, and raw persistence
   details remain excluded; expected authorization and not-found outcomes
   remain quiet, while unexpected failures use the stable
   `library_media_read_persistence` category.
   Discipleship board and student-view reads now emit redacted
   `discipleship_read_loaded` / `discipleship_read_failed` events with request
   correlation, actor/teacher IDs, scope, safe result counts, view kind, and
   duration. Names, email addresses, avatars, schedules, and raw persistence
   details remain excluded; expected authorization outcomes stay quiet while
   unexpected failures use the stable `discipleship_read_persistence`
   category.
   Enrollment list and detail reads now emit redacted
   `enrollment_read_loaded` / `enrollment_read_failed` events with request
   correlation, actor/enrollment IDs, pagination and view metadata, safe
   result counts, duration, and the stable `enrollment_read_persistence`
   failure category. Applicant identity, contact details, application answers,
   evaluation payloads, and raw persistence details remain excluded; expected
   authorization and not-found outcomes stay quiet.
   Post channel, feed, single-post, and comment reads now emit redacted
   `post_read_loaded` / `post_read_failed` events with request correlation,
   actor/post/course IDs where applicable, read scope, safe result counts,
   pagination metadata, comment counts, status, and duration. Post/comment
   content, author payloads, and raw persistence details remain excluded;
   unexpected failures use the stable `post_read_persistence` category while
   expected authorization and not-found outcomes stay quiet.
4. Keep expected user-input failures out of noisy error logs.

The next migration should target one high-value server-function family at a
time and provide stable `event`, `requestId`, `status`, and `durationMs`
fields. Do not pass raw exception messages or request bodies to the logger.
