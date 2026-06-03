CREATE TABLE "enrollment_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"evaluator_id" uuid NOT NULL,
	"score" smallint,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "enrollment_evaluations_enrollment_evaluator_unique" UNIQUE("enrollment_id","evaluator_id"),
	CONSTRAINT "enrollment_evaluations_score_range" CHECK ("enrollment_evaluations"."score" BETWEEN -9 AND 9)
);
--> statement-breakpoint
ALTER TABLE "enrollment_evaluations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "enrollment_evaluations" ADD CONSTRAINT "enrollment_evaluations_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollment_evaluations" ADD CONSTRAINT "enrollment_evaluations_evaluator_id_profiles_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "staff_view_evaluations" ON "enrollment_evaluations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher'));--> statement-breakpoint
CREATE POLICY "staff_insert_own_evaluations" ON "enrollment_evaluations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (evaluator_id = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher'));--> statement-breakpoint
CREATE POLICY "staff_update_own_evaluations" ON "enrollment_evaluations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (evaluator_id = auth.uid()) WITH CHECK (evaluator_id = auth.uid());