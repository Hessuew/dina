CREATE TYPE "public"."enrollment_status" AS ENUM('pending', 'active', 'completed', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('video', 'audio', 'document', 'image', 'other');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('announcement', 'assignment', 'grade', 'inquiry', 'enrollment', 'system');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('draft', 'submitted', 'graded', 'returned');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'teacher', 'admin');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_global" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp,
	"max_grade" integer DEFAULT 100,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"location" text,
	"zoom_link" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"teacher_id" uuid NOT NULL,
	"thumbnail_url" text,
	"is_published" boolean DEFAULT false,
	"order_index" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'pending' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"rejection_reason" text,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enrollments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"status" "inquiry_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inquiries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inquiry_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inquiry_id" uuid NOT NULL,
	"responder_id" uuid NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inquiry_responses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lesson_progress" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"video_url" text,
	"duration" integer,
	"order_index" integer DEFAULT 0 NOT NULL,
	"zoom_meeting_id" text,
	"zoom_password" text,
	"scheduled_time" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lessons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploader_id" uuid NOT NULL,
	"course_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"file_type" "media_type" NOT NULL,
	"file_size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_library" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "modules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"bio" text,
	"avatar_url" text,
	"email_notifications" boolean DEFAULT true,
	"notify_enrollment_status" boolean DEFAULT true,
	"notify_new_assignments" boolean DEFAULT true,
	"notify_grades" boolean DEFAULT true,
	"notify_inquiries" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"content" text,
	"file_url" text,
	"status" "submission_status" DEFAULT 'draft' NOT NULL,
	"grade" integer,
	"feedback" text,
	"submitted_at" timestamp,
	"graded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "announcements" ADD CONSTRAINT "announcements_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "assignments" ADD CONSTRAINT "assignments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "courses" ADD CONSTRAINT "courses_teacher_id_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_approved_by_profiles_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inquiry_responses" ADD CONSTRAINT "inquiry_responses_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inquiry_responses" ADD CONSTRAINT "inquiry_responses_responder_id_profiles_id_fk" FOREIGN KEY ("responder_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_library" ADD CONSTRAINT "media_library_uploader_id_profiles_id_fk" FOREIGN KEY ("uploader_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_library" ADD CONSTRAINT "media_library_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "modules" ADD CONSTRAINT "modules_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE POLICY "view_global_announcements" ON "announcements" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("announcements"."is_global" = true);--> statement-breakpoint
CREATE POLICY "view_course_announcements" ON "announcements" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("announcements"."course_id" IS NOT NULL AND EXISTS (
      SELECT 1 FROM "enrollments"
      WHERE course_id = "announcements"."course_id"
      AND student_id = (select auth.uid())
      AND status = 'active'
    ));--> statement-breakpoint
CREATE POLICY "teachers_manage_own_announcements" ON "announcements" AS PERMISSIVE FOR ALL TO "authenticated" USING ("announcements"."author_id" = (select auth.uid()) OR ("announcements"."course_id" IS NOT NULL AND EXISTS (
      SELECT 1 FROM "courses" WHERE id = "announcements"."course_id" AND teacher_id = (select auth.uid())
    )));--> statement-breakpoint
CREATE POLICY "admins_manage_all_announcements" ON "announcements" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM "profiles" WHERE id = (select auth.uid()) AND role = 'admin'));--> statement-breakpoint
CREATE POLICY "students_view_enrolled_assignments" ON "assignments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "enrollments"
      WHERE course_id = "assignments"."course_id"
      AND student_id = (select auth.uid())
      AND status = 'active'
    ));--> statement-breakpoint
CREATE POLICY "teachers_manage_own_assignments" ON "assignments" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM "courses" WHERE id = "assignments"."course_id" AND teacher_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "admins_manage_all_assignments" ON "assignments" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM "profiles" WHERE id = (select auth.uid()) AND role = 'admin'));--> statement-breakpoint
CREATE POLICY "view_global_events" ON "calendar_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("calendar_events"."course_id" IS NULL);--> statement-breakpoint
CREATE POLICY "view_course_events" ON "calendar_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("calendar_events"."course_id" IS NOT NULL AND EXISTS (
      SELECT 1 FROM "enrollments"
      WHERE course_id = "calendar_events"."course_id"
      AND student_id = (select auth.uid())
      AND status = 'active'
    ));--> statement-breakpoint
CREATE POLICY "teachers_manage_own_events" ON "calendar_events" AS PERMISSIVE FOR ALL TO "authenticated" USING ("calendar_events"."course_id" IS NOT NULL AND EXISTS (
      SELECT 1 FROM "courses" WHERE id = "calendar_events"."course_id" AND teacher_id = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "admins_manage_all_events" ON "calendar_events" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM "profiles" WHERE id = (select auth.uid()) AND role = 'admin'));--> statement-breakpoint
CREATE POLICY "view_published_courses" ON "courses" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("courses"."is_published" = true);--> statement-breakpoint
CREATE POLICY "teachers_manage_own_courses" ON "courses" AS PERMISSIVE FOR ALL TO "authenticated" USING ("courses"."teacher_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "admins_manage_all_courses" ON "courses" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM "profiles" WHERE id = (select auth.uid()) AND role = 'admin'));--> statement-breakpoint
CREATE POLICY "students_view_own_enrollments" ON "enrollments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("enrollments"."student_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "students_insert_own_enrollments" ON "enrollments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("enrollments"."student_id" = (select auth.uid()) AND "enrollments"."status" = 'pending');--> statement-breakpoint
CREATE POLICY "teachers_view_course_enrollments" ON "enrollments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (SELECT 1 FROM "courses" WHERE id = "enrollments"."course_id" AND teacher_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "admins_manage_all_enrollments" ON "enrollments" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM "profiles" WHERE id = (select auth.uid()) AND role = 'admin'));--> statement-breakpoint
CREATE POLICY "students_manage_own_inquiries" ON "inquiries" AS PERMISSIVE FOR ALL TO "authenticated" USING ("inquiries"."student_id" = (select auth.uid())) WITH CHECK ("inquiries"."student_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "teachers_view_course_inquiries" ON "inquiries" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (SELECT 1 FROM "courses" WHERE id = "inquiries"."course_id" AND teacher_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "teachers_update_course_inquiries" ON "inquiries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (SELECT 1 FROM "courses" WHERE id = "inquiries"."course_id" AND teacher_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "admins_manage_all_inquiries" ON "inquiries" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM "profiles" WHERE id = (select auth.uid()) AND role = 'admin'));--> statement-breakpoint
CREATE POLICY "view_inquiry_responses" ON "inquiry_responses" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "inquiries" i
      WHERE i.id = "inquiry_responses"."inquiry_id"
      AND (i.student_id = (select auth.uid()) OR EXISTS (
        SELECT 1 FROM "courses" c WHERE c.id = i.course_id AND c.teacher_id = (select auth.uid())
      ))
    ));--> statement-breakpoint
CREATE POLICY "teachers_respond_to_inquiries" ON "inquiry_responses" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
      SELECT 1 FROM "inquiries" i
      JOIN "courses" c ON c.id = i.course_id
      WHERE i.id = "inquiry_responses"."inquiry_id" AND c.teacher_id = (select auth.uid())
    ) AND "inquiry_responses"."responder_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "admins_manage_all_responses" ON "inquiry_responses" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM "profiles" WHERE id = (select auth.uid()) AND role = 'admin'));--> statement-breakpoint
CREATE POLICY "students_manage_own_progress" ON "lesson_progress" AS PERMISSIVE FOR ALL TO "authenticated" USING ("lesson_progress"."student_id" = (select auth.uid())) WITH CHECK ("lesson_progress"."student_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "teachers_view_course_progress" ON "lesson_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "lessons" l
      JOIN "modules" m ON m.id = l.module_id
      JOIN "courses" c ON c.id = m.course_id
      WHERE l.id = "lesson_progress"."lesson_id" AND c.teacher_id = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "admins_view_all_progress" ON "lesson_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (SELECT 1 FROM "profiles" WHERE id = (select auth.uid()) AND role = 'admin'));--> statement-breakpoint
CREATE POLICY "view_lessons_enrolled_courses" ON "lessons" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "modules" m
      JOIN "courses" c ON c.id = m.course_id
      JOIN "enrollments" e ON e.course_id = c.id
      WHERE m.id = "lessons"."module_id"
      AND e.student_id = (select auth.uid())
      AND e.status = 'active'
    ));--> statement-breakpoint
CREATE POLICY "teachers_manage_own_lessons" ON "lessons" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "modules" m
      JOIN "courses" c ON c.id = m.course_id
      WHERE m.id = "lessons"."module_id" AND c.teacher_id = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "admins_manage_all_lessons" ON "lessons" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM "profiles" WHERE id = (select auth.uid()) AND role = 'admin'));--> statement-breakpoint
CREATE POLICY "view_course_media" ON "media_library" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("media_library"."course_id" IS NULL OR EXISTS (
      SELECT 1 FROM "enrollments"
      WHERE course_id = "media_library"."course_id"
      AND student_id = (select auth.uid())
      AND status = 'active'
    ) OR EXISTS (
      SELECT 1 FROM "courses" WHERE id = "media_library"."course_id" AND teacher_id = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "teachers_manage_own_media" ON "media_library" AS PERMISSIVE FOR ALL TO "authenticated" USING ("media_library"."uploader_id" = (select auth.uid())) WITH CHECK ("media_library"."uploader_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "admins_manage_all_media" ON "media_library" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM "profiles" WHERE id = (select auth.uid()) AND role = 'admin'));--> statement-breakpoint
CREATE POLICY "view_modules_enrolled_courses" ON "modules" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "enrollments" e 
      JOIN "courses" c ON c.id = e.course_id 
      WHERE e.student_id = (select auth.uid())
      AND e.status = 'active' 
      AND c.id = "modules"."course_id"
    ));--> statement-breakpoint
CREATE POLICY "teachers_manage_own_modules" ON "modules" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM "courses" WHERE id = "modules"."course_id" AND teacher_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "admins_manage_all_modules" ON "modules" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM "profiles" WHERE id = (select auth.uid()) AND role = 'admin'));--> statement-breakpoint
CREATE POLICY "users_manage_own_notifications" ON "notifications" AS PERMISSIVE FOR ALL TO "authenticated" USING ("notifications"."user_id" = (select auth.uid())) WITH CHECK ("notifications"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "users_view_own_profile" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "users_update_own_profile" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = "profiles"."id");--> statement-breakpoint
CREATE POLICY "admins_view_all_profiles" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'admin'));--> statement-breakpoint
CREATE POLICY "admins_manage_all_profiles" ON "profiles" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'admin'));--> statement-breakpoint
CREATE POLICY "students_manage_own_submissions" ON "submissions" AS PERMISSIVE FOR ALL TO "authenticated" USING ("submissions"."student_id" = (select auth.uid())) WITH CHECK ("submissions"."student_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "teachers_view_course_submissions" ON "submissions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "assignments" a
      JOIN "courses" c ON c.id = a.course_id
      WHERE a.id = "submissions"."assignment_id" AND c.teacher_id = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "teachers_grade_course_submissions" ON "submissions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
      SELECT 1 FROM "assignments" a
      JOIN "courses" c ON c.id = a.course_id
      WHERE a.id = "submissions"."assignment_id" AND c.teacher_id = (select auth.uid())
    ));--> statement-breakpoint
CREATE POLICY "admins_manage_all_submissions" ON "submissions" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM "profiles" WHERE id = (select auth.uid()) AND role = 'admin'));