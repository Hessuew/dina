-- Legacy course/discipleship Zoom links are deliberately not migrated. General
-- links survive and become academy-wide; teacher links start from a clean slate.
DELETE FROM "zoom_links" WHERE "section" = 'discipleship_group';
--> statement-breakpoint
ALTER TYPE "public"."zoom_link_section" RENAME VALUE 'discipleship_group' TO 'teacher';
--> statement-breakpoint
DROP POLICY "authenticated_view_zoom_links" ON "zoom_links";
--> statement-breakpoint
ALTER TABLE "zoom_links" DROP CONSTRAINT "zoom_links_course_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "zoom_links" ADD COLUMN "teacher_id" uuid;
--> statement-breakpoint
ALTER TABLE "zoom_links" DROP COLUMN "course_id";
--> statement-breakpoint
ALTER TABLE "zoom_links" ADD CONSTRAINT "zoom_links_teacher_id_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "zoom_links" ADD CONSTRAINT "zoom_links_section_owner_check" CHECK (("section" = 'general_class_lecture' AND "teacher_id" IS NULL) OR ("section" = 'teacher' AND "teacher_id" IS NOT NULL));
--> statement-breakpoint
CREATE INDEX "zoom_links_teacher_id_idx" ON "zoom_links" USING btree ("teacher_id");
--> statement-breakpoint
-- SECURITY DEFINER is needed because ADR 0018 keeps discipleship tables
-- staff-select-only. No caller-controlled argument is accepted: auth.uid()
-- always scopes the lookup to the current student.
CREATE OR REPLACE FUNCTION public.current_discipleship_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT assignment.teacher_id
  FROM public.discipleship_assignments AS assignment
  WHERE assignment.student_id = (SELECT auth.uid())
  LIMIT 1
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.current_discipleship_teacher_id() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.current_discipleship_teacher_id() TO authenticated;
--> statement-breakpoint
CREATE POLICY "authenticated_view_visible_zoom_links" ON "zoom_links" AS PERMISSIVE FOR SELECT TO "authenticated" USING (
  "section" = 'general_class_lecture'
  OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
  OR "teacher_id" = public.current_discipleship_teacher_id()
);
