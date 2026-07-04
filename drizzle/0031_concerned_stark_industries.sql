CREATE TABLE "discipleship_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"pair_id" uuid,
	"anchor_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discipleship_assignments_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
ALTER TABLE "discipleship_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "discipleship_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"anchor_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "discipleship_groups_teacher_id_unique" UNIQUE("teacher_id")
);
--> statement-breakpoint
ALTER TABLE "discipleship_groups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "discipleship_pairs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"anchor_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discipleship_pairs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "discipleship_assignments" ADD CONSTRAINT "discipleship_assignments_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discipleship_assignments" ADD CONSTRAINT "discipleship_assignments_teacher_id_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discipleship_assignments" ADD CONSTRAINT "discipleship_assignments_pair_id_discipleship_pairs_id_fk" FOREIGN KEY ("pair_id") REFERENCES "public"."discipleship_pairs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discipleship_groups" ADD CONSTRAINT "discipleship_groups_teacher_id_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discipleship_pairs" ADD CONSTRAINT "discipleship_pairs_teacher_id_profiles_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discipleship_assignments_teacher_id_idx" ON "discipleship_assignments" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "discipleship_assignments_pair_id_idx" ON "discipleship_assignments" USING btree ("pair_id");--> statement-breakpoint
CREATE INDEX "discipleship_pairs_teacher_id_idx" ON "discipleship_pairs" USING btree ("teacher_id");--> statement-breakpoint
CREATE POLICY "staff_view_discipleship_assignments" ON "discipleship_assignments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher'));--> statement-breakpoint
CREATE POLICY "staff_insert_discipleship_assignments" ON "discipleship_assignments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR teacher_id = auth.uid());--> statement-breakpoint
CREATE POLICY "staff_update_discipleship_assignments" ON "discipleship_assignments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR teacher_id = auth.uid()) WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR teacher_id = auth.uid());--> statement-breakpoint
CREATE POLICY "staff_delete_discipleship_assignments" ON "discipleship_assignments" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR teacher_id = auth.uid());--> statement-breakpoint
CREATE POLICY "staff_view_discipleship_groups" ON "discipleship_groups" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher'));--> statement-breakpoint
CREATE POLICY "staff_insert_discipleship_groups" ON "discipleship_groups" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR teacher_id = auth.uid());--> statement-breakpoint
CREATE POLICY "staff_update_discipleship_groups" ON "discipleship_groups" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR teacher_id = auth.uid()) WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR teacher_id = auth.uid());--> statement-breakpoint
CREATE POLICY "staff_delete_discipleship_groups" ON "discipleship_groups" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR teacher_id = auth.uid());--> statement-breakpoint
CREATE POLICY "staff_view_discipleship_pairs" ON "discipleship_pairs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher'));--> statement-breakpoint
CREATE POLICY "staff_insert_discipleship_pairs" ON "discipleship_pairs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR teacher_id = auth.uid());--> statement-breakpoint
CREATE POLICY "staff_update_discipleship_pairs" ON "discipleship_pairs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR teacher_id = auth.uid()) WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR teacher_id = auth.uid());--> statement-breakpoint
CREATE POLICY "staff_delete_discipleship_pairs" ON "discipleship_pairs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR teacher_id = auth.uid());