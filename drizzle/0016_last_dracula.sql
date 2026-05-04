CREATE TYPE "public"."enrollment_gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('pending', 'under_review', 'approved', 'rejected', 'waitlisted', 'withdrawn', 'deferred');--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_legal_name" text NOT NULL,
	"preferred_name" text,
	"email" text NOT NULL,
	"year_of_birth" integer NOT NULL,
	"gender" "enrollment_gender" NOT NULL,
	"nationality_citizenship" text,
	"phone_whatsapp" text NOT NULL,
	"current_city" text,
	"current_country" text,
	"church_affiliations" text,
	"about_yourself" text NOT NULL,
	"expectations_alignment" text NOT NULL,
	"status" "enrollment_status" DEFAULT 'pending' NOT NULL,
	"invitation_sent" boolean DEFAULT false NOT NULL,
	"invitation_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enrollments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "public_insert_enrollments" ON "enrollments" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "admins_view_all_enrollments" ON "enrollments" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "admins_update_all_enrollments" ON "enrollments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "admins_delete_all_enrollments" ON "enrollments" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');