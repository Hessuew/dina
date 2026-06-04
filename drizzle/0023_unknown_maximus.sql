CREATE TYPE "public"."enrollment_admission_category" AS ENUM('new', 'emerging', 'established');--> statement-breakpoint
ALTER TABLE "enrollment_evaluations" DROP CONSTRAINT "enrollment_evaluations_score_range";--> statement-breakpoint
ALTER TABLE "enrollment_evaluations" ADD COLUMN "admission_category" "enrollment_admission_category";--> statement-breakpoint
UPDATE "enrollment_evaluations" SET "score" = NULL WHERE "score" IS NOT NULL AND ("score" < 0 OR "score" > 4);--> statement-breakpoint
ALTER TABLE "enrollment_evaluations" ADD CONSTRAINT "enrollment_evaluations_admission_category_score" CHECK ("enrollment_evaluations"."admission_category" IS NULL OR "enrollment_evaluations"."score" IN (3, 4));--> statement-breakpoint
ALTER TABLE "enrollment_evaluations" ADD CONSTRAINT "enrollment_evaluations_score_range" CHECK ("enrollment_evaluations"."score" BETWEEN 0 AND 4);