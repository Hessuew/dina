CREATE TYPE "public"."exam_attempt_status" AS ENUM('in_progress', 'submitted', 'graded');--> statement-breakpoint
CREATE TYPE "public"."exam_question_type" AS ENUM('multiple_choice', 'open_ended');--> statement-breakpoint
CREATE TYPE "public"."exam_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TABLE "exam_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_option_id" uuid,
	"text_answer" text,
	"is_correct" boolean,
	"awarded_points" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exam_answers_attempt_question_unique" UNIQUE("attempt_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "exam_answers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "exam_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "exam_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"deadline_at" timestamp NOT NULL,
	"submitted_at" timestamp,
	"graded_at" timestamp,
	"graded_by" uuid,
	"auto_score" integer,
	"manual_score" integer,
	"total_score" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exam_attempts_exam_student_unique" UNIQUE("exam_id","student_id")
);
--> statement-breakpoint
ALTER TABLE "exam_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "exam_question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"label" text NOT NULL,
	"order_index" integer NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL,
	CONSTRAINT "exam_question_options_question_order_unique" UNIQUE("question_id","order_index")
);
--> statement-breakpoint
ALTER TABLE "exam_question_options" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "exam_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exam_id" uuid NOT NULL,
	"type" "exam_question_type" NOT NULL,
	"prompt" text NOT NULL,
	"order_index" integer NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exam_questions_exam_order_unique" UNIQUE("exam_id","order_index"),
	CONSTRAINT "exam_questions_points_positive" CHECK (points > 0)
);
--> statement-breakpoint
ALTER TABLE "exam_questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "exams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"opens_at" timestamp NOT NULL,
	"closes_at" timestamp NOT NULL,
	"status" "exam_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "exams_duration_positive" CHECK (duration_minutes > 0),
	CONSTRAINT "exams_window_valid" CHECK (closes_at > opens_at)
);
--> statement-breakpoint
ALTER TABLE "exams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_attempt_id_exam_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."exam_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_question_id_exam_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."exam_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_answers" ADD CONSTRAINT "exam_answers_selected_option_id_exam_question_options_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."exam_question_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_graded_by_profiles_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_question_options" ADD CONSTRAINT "exam_question_options_question_id_exam_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."exam_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_attempts_exam_status_idx" ON "exam_attempts" USING btree ("exam_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_question_options_one_correct" ON "exam_question_options" USING btree ("question_id") WHERE is_correct;--> statement-breakpoint
CREATE INDEX "exams_status_opens_at_idx" ON "exams" USING btree ("status","opens_at");--> statement-breakpoint
CREATE POLICY "students_manage_own_exam_answers" ON "exam_answers" AS PERMISSIVE FOR ALL TO "authenticated" USING (attempt_id IN (SELECT id FROM exam_attempts WHERE student_id = auth.uid())) WITH CHECK (attempt_id IN (SELECT id FROM exam_attempts WHERE student_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "teachers_admins_view_all_exam_answers" ON "exam_answers" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin'));--> statement-breakpoint
CREATE POLICY "teachers_admins_grade_exam_answers" ON "exam_answers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')) WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin'));--> statement-breakpoint
CREATE POLICY "students_view_own_exam_attempts" ON "exam_attempts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (student_id = auth.uid());--> statement-breakpoint
CREATE POLICY "students_insert_own_exam_attempts" ON "exam_attempts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (student_id = auth.uid());--> statement-breakpoint
CREATE POLICY "students_update_own_in_progress_exam_attempts" ON "exam_attempts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (student_id = auth.uid() AND status = 'in_progress') WITH CHECK (student_id = auth.uid());--> statement-breakpoint
CREATE POLICY "teachers_admins_view_all_exam_attempts" ON "exam_attempts" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin'));--> statement-breakpoint
CREATE POLICY "teachers_admins_update_exam_attempts" ON "exam_attempts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')) WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin'));--> statement-breakpoint
CREATE POLICY "teachers_admins_manage_exam_question_options" ON "exam_question_options" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')) WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin'));--> statement-breakpoint
CREATE POLICY "students_view_published_exam_question_options" ON "exam_question_options" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'student' AND question_id IN (
        SELECT q.id FROM exam_questions q
        JOIN exams e ON q.exam_id = e.id
        WHERE e.status = 'published'
      ));--> statement-breakpoint
CREATE POLICY "teachers_admins_manage_exam_questions" ON "exam_questions" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')) WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin'));--> statement-breakpoint
CREATE POLICY "students_view_published_exam_questions" ON "exam_questions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'student' AND exam_id IN (SELECT id FROM exams WHERE status = 'published'));--> statement-breakpoint
CREATE POLICY "teachers_admins_view_all_exams" ON "exams" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin'));--> statement-breakpoint
CREATE POLICY "students_view_published_exams" ON "exams" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'student' AND status = 'published');--> statement-breakpoint
CREATE POLICY "teachers_admins_insert_exams" ON "exams" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin'));--> statement-breakpoint
CREATE POLICY "teachers_admins_update_exams" ON "exams" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')) WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin'));--> statement-breakpoint
CREATE POLICY "teachers_admins_delete_exams" ON "exams" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin'));