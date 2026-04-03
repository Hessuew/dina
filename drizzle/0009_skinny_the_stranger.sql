ALTER TABLE "profiles" ADD COLUMN "reset_token_hash" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "reset_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "reset_token_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "last_reset_request_at" timestamp;