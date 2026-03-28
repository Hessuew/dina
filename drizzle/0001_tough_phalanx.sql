ALTER TABLE "announcements" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assignments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calendar_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "courses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "enrollments" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inquiries" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inquiry_responses" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lesson_progress" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lessons" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "media_library" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "modules" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "submissions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "view_global_announcements" ON "announcements" CASCADE;--> statement-breakpoint
DROP POLICY "view_course_announcements" ON "announcements" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_manage_own_announcements" ON "announcements" CASCADE;--> statement-breakpoint
DROP POLICY "admins_manage_all_announcements" ON "announcements" CASCADE;--> statement-breakpoint
DROP POLICY "students_view_enrolled_assignments" ON "assignments" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_manage_own_assignments" ON "assignments" CASCADE;--> statement-breakpoint
DROP POLICY "admins_manage_all_assignments" ON "assignments" CASCADE;--> statement-breakpoint
DROP POLICY "view_global_events" ON "calendar_events" CASCADE;--> statement-breakpoint
DROP POLICY "view_course_events" ON "calendar_events" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_manage_own_events" ON "calendar_events" CASCADE;--> statement-breakpoint
DROP POLICY "admins_manage_all_events" ON "calendar_events" CASCADE;--> statement-breakpoint
DROP POLICY "view_published_courses" ON "courses" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_manage_own_courses" ON "courses" CASCADE;--> statement-breakpoint
DROP POLICY "admins_manage_all_courses" ON "courses" CASCADE;--> statement-breakpoint
DROP POLICY "students_view_own_enrollments" ON "enrollments" CASCADE;--> statement-breakpoint
DROP POLICY "students_insert_own_enrollments" ON "enrollments" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_view_course_enrollments" ON "enrollments" CASCADE;--> statement-breakpoint
DROP POLICY "admins_manage_all_enrollments" ON "enrollments" CASCADE;--> statement-breakpoint
DROP POLICY "students_manage_own_inquiries" ON "inquiries" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_view_course_inquiries" ON "inquiries" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_update_course_inquiries" ON "inquiries" CASCADE;--> statement-breakpoint
DROP POLICY "admins_manage_all_inquiries" ON "inquiries" CASCADE;--> statement-breakpoint
DROP POLICY "view_inquiry_responses" ON "inquiry_responses" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_respond_to_inquiries" ON "inquiry_responses" CASCADE;--> statement-breakpoint
DROP POLICY "admins_manage_all_responses" ON "inquiry_responses" CASCADE;--> statement-breakpoint
DROP POLICY "students_manage_own_progress" ON "lesson_progress" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_view_course_progress" ON "lesson_progress" CASCADE;--> statement-breakpoint
DROP POLICY "admins_view_all_progress" ON "lesson_progress" CASCADE;--> statement-breakpoint
DROP POLICY "view_lessons_enrolled_courses" ON "lessons" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_manage_own_lessons" ON "lessons" CASCADE;--> statement-breakpoint
DROP POLICY "admins_manage_all_lessons" ON "lessons" CASCADE;--> statement-breakpoint
DROP POLICY "view_course_media" ON "media_library" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_manage_own_media" ON "media_library" CASCADE;--> statement-breakpoint
DROP POLICY "admins_manage_all_media" ON "media_library" CASCADE;--> statement-breakpoint
DROP POLICY "view_modules_enrolled_courses" ON "modules" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_manage_own_modules" ON "modules" CASCADE;--> statement-breakpoint
DROP POLICY "admins_manage_all_modules" ON "modules" CASCADE;--> statement-breakpoint
DROP POLICY "users_manage_own_notifications" ON "notifications" CASCADE;--> statement-breakpoint
DROP POLICY "users_view_own_profile" ON "profiles" CASCADE;--> statement-breakpoint
DROP POLICY "users_update_own_profile" ON "profiles" CASCADE;--> statement-breakpoint
DROP POLICY "admins_view_all_profiles" ON "profiles" CASCADE;--> statement-breakpoint
DROP POLICY "admins_manage_all_profiles" ON "profiles" CASCADE;--> statement-breakpoint
DROP POLICY "students_manage_own_submissions" ON "submissions" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_view_course_submissions" ON "submissions" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_grade_course_submissions" ON "submissions" CASCADE;--> statement-breakpoint
DROP POLICY "admins_manage_all_submissions" ON "submissions" CASCADE;