# Backfill: Enrollment Status from Reviewer Score

One-time SQL for the Supabase SQL editor.
Repairs enrollment statuses so they match the assigned reviewer's actual score.

**Rules:**
- No reviewer assigned → skip (leave as-is)
- Reviewer assigned but score is null → skip (leave as-is)
- Frozen statuses (`approved`, `withdrawn`, `deferred`) → skip (never overwrite)
- Score mapping (ADR 0008):
  - `0` or `1` → `rejected`
  - `2` → `waitlisted`
  - `3` or `4` → `awaiting_approval`

---

## Step 1 — Dry run (preview only, no changes)

Run this first to see which enrollments would be updated.

```sql
WITH reviewer_scores AS (
  SELECT
    era.enrollment_id,
    ee.score,
    CASE
      WHEN ee.score <= 1 THEN 'rejected'
      WHEN ee.score = 2  THEN 'waitlisted'
      ELSE                    'awaiting_approval'
    END::enrollment_status AS derived_status
  FROM enrollment_reviewer_assignments era
  JOIN enrollment_evaluations ee
    ON  ee.enrollment_id = era.enrollment_id
    AND ee.evaluator_id  = era.reviewer_id
  WHERE ee.score IS NOT NULL
)
SELECT
  e.id,
  e.full_legal_name,
  e.status          AS current_status,
  rs.score          AS reviewer_score,
  rs.derived_status AS would_become
FROM enrollments e
JOIN reviewer_scores rs ON rs.enrollment_id = e.id
WHERE e.status NOT IN ('approved', 'withdrawn', 'deferred')
  AND e.status <> rs.derived_status
ORDER BY e.created_at;
```

---

## Step 2 — Live update

Run this only after confirming the dry-run output looks correct.

```sql
WITH reviewer_scores AS (
  SELECT
    era.enrollment_id,
    ee.score,
    CASE
      WHEN ee.score <= 1 THEN 'rejected'
      WHEN ee.score = 2  THEN 'waitlisted'
      ELSE                    'awaiting_approval'
    END::enrollment_status AS derived_status
  FROM enrollment_reviewer_assignments era
  JOIN enrollment_evaluations ee
    ON  ee.enrollment_id = era.enrollment_id
    AND ee.evaluator_id  = era.reviewer_id
  WHERE ee.score IS NOT NULL
)
UPDATE enrollments e
SET
  status     = rs.derived_status,
  updated_at = now()
FROM reviewer_scores rs
WHERE e.id = rs.enrollment_id
  AND e.status NOT IN ('approved', 'withdrawn', 'deferred')
  AND e.status <> rs.derived_status
RETURNING
  e.id,
  e.full_legal_name,
  e.status AS new_status;
```

The `RETURNING` clause shows every row that was actually changed.
