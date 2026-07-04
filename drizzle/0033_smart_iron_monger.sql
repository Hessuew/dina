CREATE TABLE "whatsapp_campaign_locks" (
	"campaign" text PRIMARY KEY NOT NULL,
	"locked_by_user_id" uuid NOT NULL,
	"locked_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_campaign_locks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "whatsapp_campaign_locks" ADD CONSTRAINT "whatsapp_campaign_locks_locked_by_user_id_profiles_id_fk" FOREIGN KEY ("locked_by_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "admins_manage_campaign_locks" ON "whatsapp_campaign_locks" AS PERMISSIVE FOR ALL TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');