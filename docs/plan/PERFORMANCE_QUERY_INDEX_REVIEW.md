# Performance Query and Index Review

**Status:** In progress  
**Phase:** Engineering Roadmap Phase 4: Performance and scale

## Review boundary

The first review targets bounded application reads that already filter and
order by stable columns:

| Read path                 | Query shape                                                        | Index                                         |
| ------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| Course/global post feed   | `course_id` plus newest-first `created_at, id`                     | `posts_course_created_at_idx`                 |
| Post comments             | `post_id` plus newest-first `created_at, id`                       | `post_comments_post_created_at_idx`           |
| Notification inbox        | `user_id`, unread filtering, and recent activity                   | `post_notifications_user_read_created_at_idx` |
| Course lesson reads       | `course_id` plus ascending `order_index`                           | `lessons_course_order_idx`                    |
| Upcoming lesson dashboard | published lessons with future `scheduled_time`, ascending, limit 5 | `lessons_published_scheduled_idx`             |
| Assignment catalog        | managed `lesson_id` membership plus assignment `status`            | `assignments_lesson_status_idx`               |

These indexes support the existing cursor pagination, unread read-state,
ordered/upcoming lesson, and assignment catalog queries without changing
response shape or retention behavior. They are additive and safe for the
expand/contract release procedure.

## Verification contract

- The migration is replayed by `bun run test:integration`.
- The affected post, notification, and course integration suites must remain
  green.
- After hosted data exists, capture `EXPLAIN (ANALYZE, BUFFERS)` for the six
  query shapes in a controlled development environment and record only plan
  summaries and timings in the performance review record.
- Revisit index usefulness after production traffic is available; remove or
  refine indexes only through a later measured migration.

## Remaining Phase 4 review

Production evidence is still needed before changing pagination limits,
caching, connection behavior, or rate-limit policy. Those changes should be
separate, measured slices rather than inferred from local seed data. A due-date
index for the unbounded student assignment list remains evidence-gated.
