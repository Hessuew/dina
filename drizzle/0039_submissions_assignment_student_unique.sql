-- Merge duplicate rows before enforcing uniqueness. Keep latest answer text,
-- strongest lifecycle status, and latest grading record on one canonical row.
WITH duplicate_groups AS (
  SELECT
    "assignment_id",
    "student_id",
    min("created_at") AS "created_at",
    max("updated_at") AS "updated_at",
    max("submitted_at") AS "submitted_at",
    max(
      CASE "status"
        WHEN 'draft' THEN 1
        WHEN 'submitted' THEN 2
        WHEN 'graded' THEN 3
        WHEN 'returned' THEN 4
      END
    ) AS "status_rank"
  FROM "submissions"
  GROUP BY "assignment_id", "student_id"
  HAVING count(*) > 1
),
canonical_rows AS (
  SELECT DISTINCT ON (s."assignment_id", s."student_id")
    s."id",
    s."assignment_id",
    s."student_id",
    s."grade",
    s."feedback",
    s."graded_at"
  FROM "submissions" s
  INNER JOIN duplicate_groups d
    ON d."assignment_id" = s."assignment_id"
    AND d."student_id" = s."student_id"
  ORDER BY
    s."assignment_id",
    s."student_id",
    (s."grade" IS NOT NULL) DESC,
    s."graded_at" DESC NULLS LAST,
    s."updated_at" DESC,
    s."created_at" DESC,
    s."id" DESC
),
latest_content AS (
  SELECT DISTINCT ON (s."assignment_id", s."student_id")
    s."assignment_id",
    s."student_id",
    s."content"
  FROM "submissions" s
  INNER JOIN duplicate_groups d
    ON d."assignment_id" = s."assignment_id"
    AND d."student_id" = s."student_id"
  WHERE s."content" IS NOT NULL
  ORDER BY
    s."assignment_id",
    s."student_id",
    s."updated_at" DESC,
    s."created_at" DESC,
    s."id" DESC
)
UPDATE "submissions" keeper
SET
  "content" = COALESCE(latest_content."content", keeper."content"),
  "status" = CASE duplicate_groups."status_rank"
    WHEN 4 THEN 'returned'
    WHEN 3 THEN 'graded'
    WHEN 2 THEN 'submitted'
    ELSE 'draft'
  END::"submission_status",
  "submitted_at" = COALESCE(
    duplicate_groups."submitted_at",
    keeper."submitted_at"
  ),
  "grade" = canonical_rows."grade",
  "feedback" = canonical_rows."feedback",
  "graded_at" = canonical_rows."graded_at",
  "created_at" = duplicate_groups."created_at",
  "updated_at" = duplicate_groups."updated_at"
FROM canonical_rows
INNER JOIN duplicate_groups
  ON duplicate_groups."assignment_id" = canonical_rows."assignment_id"
  AND duplicate_groups."student_id" = canonical_rows."student_id"
LEFT JOIN latest_content
  ON latest_content."assignment_id" = canonical_rows."assignment_id"
  AND latest_content."student_id" = canonical_rows."student_id"
WHERE keeper."id" = canonical_rows."id";
--> statement-breakpoint
WITH ranked_submissions AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "assignment_id", "student_id"
      ORDER BY
        ("grade" IS NOT NULL) DESC,
        "graded_at" DESC NULLS LAST,
        "updated_at" DESC,
        "created_at" DESC,
        "id" DESC
    ) AS duplicate_rank
  FROM "submissions"
)
DELETE FROM "submissions"
USING ranked_submissions
WHERE "submissions"."id" = ranked_submissions."id"
  AND ranked_submissions.duplicate_rank > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_assignment_student_unique"
ON "submissions" USING btree ("assignment_id", "student_id");
