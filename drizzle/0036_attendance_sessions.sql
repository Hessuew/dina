CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"opened_at" timestamp,
	"closes_at" timestamp,
	"opened_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_sessions_lesson_id_unique" UNIQUE("lesson_id")
);
--> statement-breakpoint
ALTER TABLE "attendance_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "attendance_presents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"checked_in_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_presents_session_student_unique" UNIQUE("session_id","student_id")
);
--> statement-breakpoint
ALTER TABLE "attendance_presents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_opened_by_profiles_id_fk" FOREIGN KEY ("opened_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_presents" ADD CONSTRAINT "attendance_presents_session_id_attendance_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_presents" ADD CONSTRAINT "attendance_presents_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_sessions_course_id_idx" ON "attendance_sessions" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "attendance_sessions_course_closes_at_idx" ON "attendance_sessions" USING btree ("course_id","closes_at");--> statement-breakpoint
CREATE INDEX "attendance_presents_student_id_idx" ON "attendance_presents" USING btree ("student_id");--> statement-breakpoint
CREATE POLICY "authenticated_view_attendance_sessions" ON "attendance_sessions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "teachers_manage_assigned_attendance_sessions" ON "attendance_sessions" AS PERMISSIVE FOR ALL TO "authenticated" USING (
        course_id IN (
          SELECT course_id FROM course_teachers
          WHERE teacher_id = auth.uid()
        )
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
      ) WITH CHECK (
        course_id IN (
          SELECT course_id FROM course_teachers
          WHERE teacher_id = auth.uid()
        )
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
      );--> statement-breakpoint
CREATE POLICY "students_view_own_attendance_presents" ON "attendance_presents" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
        student_id = auth.uid()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
      );--> statement-breakpoint
CREATE POLICY "students_insert_own_attendance_presents" ON "attendance_presents" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        student_id = auth.uid()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
      );
