CREATE TYPE "public"."assignment_status" AS ENUM('draft', 'published', 'closed');--> statement-breakpoint
ALTER TABLE "assignments" RENAME COLUMN "course_id" TO "lesson_id";--> statement-breakpoint
ALTER TABLE "assignments" DROP CONSTRAINT "assignments_course_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "assignments" ALTER COLUMN "due_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "status" "assignment_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "is_published" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;