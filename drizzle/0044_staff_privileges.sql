CREATE TYPE "public"."staff_privilege" AS ENUM('attendance_override', 'enrollment_contact_export');--> statement-breakpoint
CREATE TABLE "staff_privileges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"privilege" "staff_privilege" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "staff_privileges_user_privilege_unique" UNIQUE("user_id","privilege")
);
--> statement-breakpoint
ALTER TABLE "staff_privileges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "staff_privileges" ADD CONSTRAINT "staff_privileges_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "admins_manage_staff_privileges" ON "staff_privileges" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
