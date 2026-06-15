CREATE TABLE "account_security" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"reset_token_hash" text,
	"reset_token_expires_at" timestamp,
	"reset_token_attempts" integer DEFAULT 0 NOT NULL,
	"last_reset_request_at" timestamp,
	"pending_email" text,
	"email_change_token_hash" text,
	"email_change_token_expires_at" timestamp,
	"email_change_token_attempts" integer DEFAULT 0 NOT NULL,
	"last_email_change_request_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_security" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "account_security" ADD CONSTRAINT "account_security_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "account_security" (
	"profile_id", "reset_token_hash", "reset_token_expires_at", "reset_token_attempts",
	"last_reset_request_at", "pending_email", "email_change_token_hash",
	"email_change_token_expires_at", "email_change_token_attempts", "last_email_change_request_at"
)
SELECT "id", "reset_token_hash", "reset_token_expires_at", "reset_token_attempts",
	"last_reset_request_at", "pending_email", "email_change_token_hash",
	"email_change_token_expires_at", "email_change_token_attempts", "last_email_change_request_at"
FROM "profiles";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "reset_token_hash";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "reset_token_expires_at";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "reset_token_attempts";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "last_reset_request_at";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "pending_email";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "email_change_token_hash";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "email_change_token_expires_at";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "email_change_token_attempts";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "last_email_change_request_at";--> statement-breakpoint
CREATE POLICY "users_view_own_account_security" ON "account_security" AS PERMISSIVE FOR SELECT TO "authenticated" USING (profile_id = auth.uid());