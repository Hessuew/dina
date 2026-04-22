CREATE TYPE "public"."calendar_event_category" AS ENUM('exam', 'chapel', 'personal');--> statement-breakpoint
ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "course_teachers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inquiries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inquiry_responses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lesson_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "media_library" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD COLUMN "category" "calendar_event_category";--> statement-breakpoint
CREATE POLICY "authenticated_view_announcements" ON "announcements" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "users_update_own_announcements" ON "announcements" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());--> statement-breakpoint
CREATE POLICY "teachers_insert_course_announcements" ON "announcements" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        (is_global = false AND course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )) OR (is_global = true AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
      );--> statement-breakpoint
CREATE POLICY "admins_insert_global_announcements" ON "announcements" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "authenticated_view_assignments" ON "assignments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "teachers_update_assigned_assignments" ON "assignments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        lesson_id IN (
          SELECT l.id FROM lessons l
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      ) WITH CHECK (
        lesson_id IN (
          SELECT l.id FROM lessons l
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "admins_update_all_assignments" ON "assignments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "teachers_insert_assigned_assignments" ON "assignments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        lesson_id IN (
          SELECT l.id FROM lessons l
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "admins_insert_assignments" ON "assignments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "authenticated_view_events" ON "calendar_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "teachers_update_course_events" ON "calendar_events" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        course_id IS NULL OR course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      ) WITH CHECK (
        course_id IS NULL OR course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "admins_update_all_events" ON "calendar_events" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "teachers_create_course_events" ON "calendar_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        course_id IS NULL OR course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "admins_create_events" ON "calendar_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "teachers_view_own_assignments" ON "course_teachers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (teacher_id = auth.uid());--> statement-breakpoint
CREATE POLICY "admins_view_all_assignments" ON "course_teachers" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "teachers_update_own_assignments" ON "course_teachers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());--> statement-breakpoint
CREATE POLICY "admins_update_all_assignments" ON "course_teachers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "admins_insert_assignments" ON "course_teachers" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "authenticated_view_courses" ON "courses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "teachers_update_assigned_courses" ON "courses" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      ) WITH CHECK (
        id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "admins_update_all_courses" ON "courses" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "teachers_insert_assigned_courses" ON "courses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "admins_insert_courses" ON "courses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "students_view_own_inquiries" ON "inquiries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (student_id = auth.uid());--> statement-breakpoint
CREATE POLICY "teachers_view_course_inquiries" ON "inquiries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "admins_view_all_inquiries" ON "inquiries" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "students_update_own_inquiries" ON "inquiries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());--> statement-breakpoint
CREATE POLICY "teachers_respond_course_inquiries" ON "inquiries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      ) WITH CHECK (
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "students_insert_own_inquiries" ON "inquiries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (student_id = auth.uid());--> statement-breakpoint
CREATE POLICY "users_view_own_inquiry_responses" ON "inquiry_responses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
        inquiry_id IN (
          SELECT id FROM inquiries 
          WHERE student_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "teachers_view_course_responses" ON "inquiry_responses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
        inquiry_id IN (
          SELECT i.id FROM inquiries i
          WHERE i.course_id IN (
            SELECT course_id FROM course_teachers 
            WHERE teacher_id = auth.uid()
          )
        )
      );--> statement-breakpoint
CREATE POLICY "admins_view_all_responses" ON "inquiry_responses" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "users_update_own_responses" ON "inquiry_responses" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (responder_id = auth.uid()) WITH CHECK (responder_id = auth.uid());--> statement-breakpoint
CREATE POLICY "teachers_insert_course_responses" ON "inquiry_responses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        inquiry_id IN (
          SELECT i.id FROM inquiries i
          WHERE i.course_id IN (
            SELECT course_id FROM course_teachers 
            WHERE teacher_id = auth.uid()
          )
        )
      );--> statement-breakpoint
CREATE POLICY "admins_insert_responses" ON "inquiry_responses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "public_view_invitation_by_token" ON "invitations" AS PERMISSIVE FOR SELECT TO public USING (token IS NOT NULL AND status = 'pending' AND expires_at > NOW());--> statement-breakpoint
CREATE POLICY "public_update_otp_verification" ON "invitations" AS PERMISSIVE FOR UPDATE TO public USING (token IS NOT NULL AND status = 'pending' AND expires_at > NOW()) WITH CHECK (token IS NOT NULL AND status = 'pending' AND expires_at > NOW());--> statement-breakpoint
CREATE POLICY "users_view_own_invitations" ON "invitations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (invited_by = auth.uid());--> statement-breakpoint
CREATE POLICY "admins_view_all_invitations" ON "invitations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "admins_update_all_invitations" ON "invitations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "staff_insert_invitations" ON "invitations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher'));--> statement-breakpoint
CREATE POLICY "students_view_own_progress" ON "lesson_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING (student_id = auth.uid());--> statement-breakpoint
CREATE POLICY "teachers_view_course_progress" ON "lesson_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
        lesson_id IN (
          SELECT l.id FROM lessons l
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "admins_view_all_progress" ON "lesson_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "students_update_own_progress" ON "lesson_progress" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());--> statement-breakpoint
CREATE POLICY "students_insert_own_progress" ON "lesson_progress" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (student_id = auth.uid());--> statement-breakpoint
CREATE POLICY "authenticated_view_lessons" ON "lessons" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "teachers_update_assigned_lessons" ON "lessons" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      ) WITH CHECK (
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "admins_update_all_lessons" ON "lessons" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "teachers_insert_assigned_lessons" ON "lessons" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "admins_insert_lessons" ON "lessons" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "authenticated_view_media" ON "media_library" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "uploaders_update_own_media" ON "media_library" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (uploader_id = auth.uid()) WITH CHECK (uploader_id = auth.uid());--> statement-breakpoint
CREATE POLICY "teachers_update_course_media" ON "media_library" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      ) WITH CHECK (
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "admins_update_all_media" ON "media_library" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "users_upload_own_media" ON "media_library" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (uploader_id = auth.uid());--> statement-breakpoint
CREATE POLICY "teachers_upload_course_media" ON "media_library" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        course_id IS NULL OR course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "users_view_own_notifications" ON "notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "users_update_own_notifications" ON "notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "staff_create_notifications" ON "notifications" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher'));--> statement-breakpoint
CREATE POLICY "users_view_own_profile" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (id = auth.uid());--> statement-breakpoint
CREATE POLICY "teachers_view_all_profiles" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher');--> statement-breakpoint
CREATE POLICY "admins_view_all_profiles" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "users_update_own_profile" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (id = auth.uid()) WITH CHECK (id = auth.uid());--> statement-breakpoint
CREATE POLICY "admins_update_all_profiles" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "users_insert_own_profile" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (id = auth.uid());--> statement-breakpoint
CREATE POLICY "admins_insert_profiles" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "students_view_own_submissions" ON "submissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (student_id = auth.uid());--> statement-breakpoint
CREATE POLICY "teachers_view_course_submissions" ON "submissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
        assignment_id IN (
          SELECT a.id FROM assignments a
          JOIN lessons l ON a.lesson_id = l.id
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "admins_view_all_submissions" ON "submissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "students_update_own_submissions" ON "submissions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());--> statement-breakpoint
CREATE POLICY "teachers_grade_course_submissions" ON "submissions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (
        assignment_id IN (
          SELECT a.id FROM assignments a
          JOIN lessons l ON a.lesson_id = l.id
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      ) WITH CHECK (
        assignment_id IN (
          SELECT a.id FROM assignments a
          JOIN lessons l ON a.lesson_id = l.id
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      );--> statement-breakpoint
CREATE POLICY "students_insert_own_submissions" ON "submissions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (student_id = auth.uid());