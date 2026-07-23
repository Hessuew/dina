ALTER TYPE "public"."calendar_event_category" ADD VALUE IF NOT EXISTS 'lesson';
ALTER TABLE "calendar_events" ALTER COLUMN "end_time" DROP NOT NULL;
