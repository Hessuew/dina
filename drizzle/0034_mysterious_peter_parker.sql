CREATE TYPE "public"."email_message_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_type" AS ENUM('invitation');--> statement-breakpoint
CREATE TABLE "email_campaign_locks" (
	"campaign" text PRIMARY KEY NOT NULL,
	"locked_by_user_id" uuid NOT NULL,
	"locked_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_campaign_locks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"recipient_email" text NOT NULL,
	"email_type" "email_type" NOT NULL,
	"status" "email_message_status" NOT NULL,
	"provider_message_id" text,
	"error_message" text,
	"sent_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_campaign_locks" ADD CONSTRAINT "email_campaign_locks_locked_by_user_id_profiles_id_fk" FOREIGN KEY ("locked_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_sent_by_user_id_profiles_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_messages_enrollment_type_idx" ON "email_messages" USING btree ("enrollment_id","email_type");--> statement-breakpoint
CREATE POLICY "admins_manage_email_campaign_locks" ON "email_campaign_locks" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "admins_view_all_email_messages" ON "email_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "admins_insert_email_messages" ON "email_messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');