CREATE TABLE "course_substitutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"substitute_teacher_id" uuid NOT NULL,
	"absent_teacher_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "course_substitutes_substitute_course_unique" UNIQUE("substitute_teacher_id","course_id"),
	CONSTRAINT "course_substitutes_absent_course_unique" UNIQUE("absent_teacher_id","course_id")
);
--> statement-breakpoint
ALTER TABLE "course_substitutes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP INDEX "course_teachers_teacher_id_idx";--> statement-breakpoint
ALTER TABLE "enrollment_reviewer_assignments" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "course_substitutes" ADD CONSTRAINT "course_substitutes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_substitutes" ADD CONSTRAINT "course_substitutes_substitute_teacher_id_profiles_id_fk" FOREIGN KEY ("substitute_teacher_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_substitutes" ADD CONSTRAINT "course_substitutes_absent_teacher_id_profiles_id_fk" FOREIGN KEY ("absent_teacher_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_reviewer_assignments" ADD CONSTRAINT "enrollment_reviewer_assignments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_teachers_teacher_id_unique" ON "course_teachers" USING btree ("teacher_id");--> statement-breakpoint
CREATE POLICY "admins_manage_course_substitutes" ON "course_substitutes" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "teachers_view_own_substitutions" ON "course_substitutes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (substitute_teacher_id = auth.uid() OR absent_teacher_id = auth.uid());--> statement-breakpoint
-- Backfill: populate enrollment_reviewer_assignments.course_id from the reviewer's
-- course_teachers entry. Admin-assigned reviewers with no course_teachers row stay NULL.
UPDATE "enrollment_reviewer_assignments" era
SET "course_id" = ct."course_id"
FROM "course_teachers" ct
WHERE ct."teacher_id" = era."reviewer_id";