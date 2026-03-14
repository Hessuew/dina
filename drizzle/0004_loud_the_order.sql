-- First, update profiles.id since it's the primary key that others reference
ALTER TABLE "profiles" ALTER COLUMN "id" SET DATA TYPE uuid USING "id"::uuid;--> statement-breakpoint

-- Now update all foreign keys that reference profiles.id
ALTER TABLE "announcements" ALTER COLUMN "author_id" SET DATA TYPE uuid USING "author_id"::uuid;--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "teacher_id" SET DATA TYPE uuid USING "teacher_id"::uuid;--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "student_id" SET DATA TYPE uuid USING "student_id"::uuid;--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "approved_by" SET DATA TYPE uuid USING "approved_by"::uuid;--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "student_id" SET DATA TYPE uuid USING "student_id"::uuid;--> statement-breakpoint
ALTER TABLE "inquiry_responses" ALTER COLUMN "responder_id" SET DATA TYPE uuid USING "responder_id"::uuid;--> statement-breakpoint
ALTER TABLE "lesson_progress" ALTER COLUMN "student_id" SET DATA TYPE uuid USING "student_id"::uuid;--> statement-breakpoint
ALTER TABLE "media_library" ALTER COLUMN "uploader_id" SET DATA TYPE uuid USING "uploader_id"::uuid;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "student_id" SET DATA TYPE uuid USING "student_id"::uuid;