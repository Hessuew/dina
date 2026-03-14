ALTER TABLE "modules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "modules" CASCADE;--> statement-breakpoint
-- ALTER TABLE "lessons" DROP CONSTRAINT "lessons_module_id_modules_id_fk";
-- --> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "course_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" DROP COLUMN "module_id";
