ALTER TABLE "enrollments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "enrollments" CASCADE;--> statement-breakpoint
ALTER TABLE "courses" DROP CONSTRAINT "courses_teacher_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "courses" DROP COLUMN "teacher_id";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "notify_enrollment_status";--> statement-breakpoint
DROP TYPE "public"."enrollment_status";