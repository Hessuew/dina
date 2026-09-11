# Performance Query and Index Review

**Status:** In progress  
**Phase:** Engineering Roadmap Phase 4: Performance and scale

## Review boundary

The first review targets bounded application reads that already filter and
order by stable columns:

| Read path                  | Query shape                                                        | Index                                         |
| -------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| Course/global post feed    | `course_id` plus newest-first `created_at, id`                     | `posts_course_created_at_idx`                 |
| Post comments              | `post_id` plus newest-first `created_at, id`                       | `post_comments_post_created_at_idx`           |
| Notification inbox         | `user_id`, unread filtering, and recent activity                   | `post_notifications_user_read_created_at_idx` |
| Course lesson reads        | `course_id` plus ascending `order_index`                           | `lessons_course_order_idx`                    |
| Upcoming lesson dashboard  | published lessons with future `scheduled_time`, ascending, limit 5 | `lessons_published_scheduled_idx`             |
| Assignment catalog         | managed `lesson_id` membership plus assignment `status`            | `assignments_lesson_status_idx`               |
| Teacher lesson assignments | managed `lesson_id` membership plus ascending `due_date`           | `assignments_lesson_due_date_idx`             |
| Course-team reads          | `course_id` membership plus oldest-first `created_at`              | `course_teachers_course_created_at_idx`       |
| Student submission reads   | `student_id` lookup for assignment and teacher/student views       | `submissions_student_id_idx`                  |
| Open attendance sessions   | active `closes_at` plus newest-first `opened_at`                   | `attendance_sessions_closes_at_opened_at_idx` |

These indexes support the existing cursor pagination, unread read-state,
ordered/upcoming lesson, assignment catalog, teacher lesson assignment,
course-team, and student submission queries without changing response shape or
retention behavior. They are additive and safe for the expand/contract release
procedure.

## Verification contract

- The migration is replayed by `bun run test:integration`.
- The affected post, notification, and course integration suites must remain
  green.
- After hosted data exists, capture `EXPLAIN (ANALYZE, BUFFERS)` for the ten
  query shapes in a controlled development environment and record only plan
  summaries and timings in the performance review record for the ten
  indexed query shapes.
- Revisit index usefulness after production traffic is available; remove or
  refine indexes only through a later measured migration.

## Iteration 65 — student submission lookup index

This iteration completed the next repository-owned Phase 4 slice:

- Added `submissions_student_id_idx` for the existing student-scoped
  submission reads used by the assignment dashboard and teacher/student
  submission views.
- Kept conflict-safe assignment saves, authorization, response shape, and
  grading behavior unchanged. The index is additive and complements the
  existing `(assignment_id, student_id)` uniqueness index rather than
  replacing it.
- Hosted verification now covers eight `EXPLAIN (ANALYZE, BUFFERS)` shapes;
  the due-date index for the unbounded student assignment list remains
  evidence-gated.

## Iteration 66 — teacher lesson assignment due-date index

This iteration completed the next repository-owned Phase 4 slice:

- Added `assignments_lesson_due_date_idx` on `(lesson_id, due_date)` for the
  existing teacher lesson assignment query, which filters to managed lesson
  IDs and orders assignments by due date.
- Kept authorization, response shape, publication behavior, and the separate
  managed-lesson status catalog query unchanged. The index is additive and
  complements `assignments_lesson_status_idx` rather than replacing it.
- Hosted verification now covers nine `EXPLAIN (ANALYZE, BUFFERS)` shapes. The
  unbounded student assignment list still needs representative hosted data
  before a due-date-only index is considered.

## Remaining Phase 4 review

Production evidence is still needed before changing pagination limits,
caching, connection behavior, or rate-limit policy. Those changes should be
separate, measured slices rather than inferred from local seed data. A due-date
index for the unbounded student assignment list remains evidence-gated.

## Iteration 67 — open attendance session index

This iteration completed the next repository-owned Phase 4 slice:

- Added `attendance_sessions_closes_at_opened_at_idx` on `(closes_at,
opened_at)` for the existing student open-session read, which filters out
  closed windows and orders the remaining sessions by most recent opening.
- Kept attendance authorization, session lifecycle, check-in idempotency, and
  response shape unchanged. The index is additive and complements the existing
  course-scoped `(course_id, closes_at)` index used by open/close mutations.
- Hosted verification now covers ten `EXPLAIN (ANALYZE, BUFFERS)` shapes; the
  unbounded student assignment list still needs representative hosted data
  before a due-date-only index is considered.
