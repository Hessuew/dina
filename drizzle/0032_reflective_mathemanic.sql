CREATE TYPE "public"."whatsapp_message_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"recipient_phone" text NOT NULL,
	"template_name" text NOT NULL,
	"status" "whatsapp_message_status" NOT NULL,
	"provider_message_id" text,
	"error_message" text,
	"sent_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_sent_by_user_id_profiles_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "whatsapp_messages_enrollment_template_idx" ON "whatsapp_messages" USING btree ("enrollment_id","template_name");--> statement-breakpoint
CREATE POLICY "admins_view_all_whatsapp_messages" ON "whatsapp_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "admins_insert_whatsapp_messages" ON "whatsapp_messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');