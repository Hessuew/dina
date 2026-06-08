# Backfill: set `under_review` for single-reviewer 3/4 evaluations

## Context

ADR 0008 rev 1 changed the meaning of `under_review`:

- **Before:** reviewer hadn't scored yet  
- **After:** reviewer scored 3 or 4 **and** the peer has not yet evaluated

Enrollments that already have exactly one evaluation (the assigned reviewer's)
with score 3 or 4 are currently sitting at `awaiting_approval` (set by the old
logic). They should be moved to `under_review` because the peer cross-check is
still pending.

Frozen admin decisions (`approved`, `withdrawn`, `deferred`) are never touched.

## SQL

```sql
UPDATE enrollments
SET
  status     = 'under_review',
  updated_at = now()
WHERE id IN (
  SELECT e.id
  FROM   enrollments e
  -- must have an assigned reviewer who scored 3 or 4
  JOIN   enrollment_reviewer_assignments era
         ON  era.enrollment_id = e.id
  JOIN   enrollment_evaluations ee
         ON  ee.enrollment_id = e.id
         AND ee.evaluator_id  = era.reviewer_id
         AND ee.score IN (3, 4)
  -- peer has not evaluated: only one evaluation row exists for this enrollment
  WHERE (
    SELECT count(*)
    FROM   enrollment_evaluations
    WHERE  enrollment_id = e.id
  ) = 1
  -- respect frozen admin decisions
  AND e.status NOT IN ('approved', 'withdrawn', 'deferred')
);
```

## Dry-run (preview affected rows before updating)

```sql
SELECT
  e.id,
  e.full_legal_name,
  e.status            AS current_status,
  ee.score            AS reviewer_score,
  p.full_name         AS reviewer_name
FROM   enrollments e
JOIN   enrollment_reviewer_assignments era
       ON  era.enrollment_id = e.id
JOIN   enrollment_evaluations ee
       ON  ee.enrollment_id = e.id
       AND ee.evaluator_id  = era.reviewer_id
       AND ee.score IN (3, 4)
JOIN   profiles p ON p.id = era.reviewer_id
WHERE (
  SELECT count(*)
  FROM   enrollment_evaluations
  WHERE  enrollment_id = e.id
) = 1
AND e.status NOT IN ('approved', 'withdrawn', 'deferred')
ORDER BY e.created_at;
```
