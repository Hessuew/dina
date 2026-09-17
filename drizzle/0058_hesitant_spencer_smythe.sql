DROP POLICY "students_view_own_progress" ON "lesson_progress" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_view_course_progress" ON "lesson_progress" CASCADE;--> statement-breakpoint
DROP POLICY "admins_view_all_progress" ON "lesson_progress" CASCADE;--> statement-breakpoint
DROP POLICY "students_update_own_progress" ON "lesson_progress" CASCADE;--> statement-breakpoint
DROP POLICY "students_insert_own_progress" ON "lesson_progress" CASCADE;--> statement-breakpoint
DROP TABLE "lesson_progress" CASCADE;