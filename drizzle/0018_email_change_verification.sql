ALTER TABLE "profiles" ADD COLUMN "pending_email" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "email_change_token_hash" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "email_change_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "email_change_token_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "last_email_change_request_at" timestamp;