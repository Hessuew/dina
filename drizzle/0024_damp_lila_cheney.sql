CREATE TABLE "enrollment_reviewer_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enrollment_reviewer_assignments_enrollment_id_unique" UNIQUE("enrollment_id")
);
--> statement-breakpoint
ALTER TABLE "enrollment_reviewer_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "enrollment_reviewer_assignments" ADD CONSTRAINT "enrollment_reviewer_assignments_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_reviewer_assignments" ADD CONSTRAINT "enrollment_reviewer_assignments_reviewer_id_profiles_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enrollment_reviewer_assignments_reviewer_enrollment_idx" ON "enrollment_reviewer_assignments" USING btree ("reviewer_id","enrollment_id");--> statement-breakpoint
CREATE POLICY "admins_view_all_reviewer_assignments" ON "enrollment_reviewer_assignments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "teachers_view_own_reviewer_assignments" ON "enrollment_reviewer_assignments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (reviewer_id = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher');--> statement-breakpoint
CREATE POLICY "admins_insert_reviewer_assignments" ON "enrollment_reviewer_assignments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "admins_update_reviewer_assignments" ON "enrollment_reviewer_assignments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "admins_delete_reviewer_assignments" ON "enrollment_reviewer_assignments" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');