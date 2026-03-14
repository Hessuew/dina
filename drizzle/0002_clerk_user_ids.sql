-- Migration to change profiles.id and all foreign keys from UUID to TEXT for Clerk user IDs
-- WARNING: This will delete all existing data in profiles and related tables

-- Step 1: Drop all foreign key constraints
ALTER TABLE "announcements" DROP CONSTRAINT IF EXISTS "announcements_author_id_profiles_id_fk";
ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "courses_teacher_id_profiles_id_fk";
ALTER TABLE "enrollments" DROP CONSTRAINT IF EXISTS "enrollments_student_id_profiles_id_fk";
ALTER TABLE "enrollments" DROP CONSTRAINT IF EXISTS "enrollments_approved_by_profiles_id_fk";
ALTER TABLE "inquiries" DROP CONSTRAINT IF EXISTS "inquiries_student_id_profiles_id_fk";
ALTER TABLE "inquiry_responses" DROP CONSTRAINT IF EXISTS "inquiry_responses_responder_id_profiles_id_fk";
ALTER TABLE "lesson_progress" DROP CONSTRAINT IF EXISTS "lesson_progress_student_id_profiles_id_fk";
ALTER TABLE "media_library" DROP CONSTRAINT IF EXISTS "media_library_uploader_id_profiles_id_fk";
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_user_id_profiles_id_fk";
ALTER TABLE "submissions" DROP CONSTRAINT IF EXISTS "submissions_student_id_profiles_id_fk";

-- Step 2: Truncate all tables (delete all data)
TRUNCATE TABLE "notifications" CASCADE;
TRUNCATE TABLE "submissions" CASCADE;
TRUNCATE TABLE "inquiry_responses" CASCADE;
TRUNCATE TABLE "inquiries" CASCADE;
TRUNCATE TABLE "lesson_progress" CASCADE;
TRUNCATE TABLE "enrollments" CASCADE;
TRUNCATE TABLE "announcements" CASCADE;
TRUNCATE TABLE "media_library" CASCADE;
TRUNCATE TABLE "courses" CASCADE;
TRUNCATE TABLE "profiles" CASCADE;

-- Step 3: Change column types from UUID to TEXT
ALTER TABLE "profiles" ALTER COLUMN "id" SET DATA TYPE text;
ALTER TABLE "announcements" ALTER COLUMN "author_id" SET DATA TYPE text;
ALTER TABLE "courses" ALTER COLUMN "teacher_id" SET DATA TYPE text;
ALTER TABLE "enrollments" ALTER COLUMN "student_id" SET DATA TYPE text;
ALTER TABLE "enrollments" ALTER COLUMN "approved_by" SET DATA TYPE text;
ALTER TABLE "inquiries" ALTER COLUMN "student_id" SET DATA TYPE text;
ALTER TABLE "inquiry_responses" ALTER COLUMN "responder_id" SET DATA TYPE text;
ALTER TABLE "lesson_progress" ALTER COLUMN "student_id" SET DATA TYPE text;
ALTER TABLE "media_library" ALTER COLUMN "uploader_id" SET DATA TYPE text;
ALTER TABLE "notifications" ALTER COLUMN "user_id" SET DATA TYPE text;
ALTER TABLE "submissions" ALTER COLUMN "student_id" SET DATA TYPE text;

-- Step 4: Recreate foreign key constraints
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_profiles_id_fk" 
  FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "courses" ADD CONSTRAINT "courses_teacher_id_profiles_id_fk" 
  FOREIGN KEY ("teacher_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_profiles_id_fk" 
  FOREIGN KEY ("student_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_approved_by_profiles_id_fk" 
  FOREIGN KEY ("approved_by") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_student_id_profiles_id_fk" 
  FOREIGN KEY ("student_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "inquiry_responses" ADD CONSTRAINT "inquiry_responses_responder_id_profiles_id_fk" 
  FOREIGN KEY ("responder_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_student_id_profiles_id_fk" 
  FOREIGN KEY ("student_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "media_library" ADD CONSTRAINT "media_library_uploader_id_profiles_id_fk" 
  FOREIGN KEY ("uploader_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" 
  FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_profiles_id_fk" 
  FOREIGN KEY ("student_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
