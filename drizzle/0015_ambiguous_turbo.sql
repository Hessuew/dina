CREATE TYPE "public"."post_notification_event" AS ENUM('post_created', 'comment_created');--> statement-breakpoint
CREATE TABLE "post_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"event" "post_notification_event" NOT NULL,
	"post_id" uuid NOT NULL,
	"comment_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY "students_view_own_inquiries" ON "inquiries" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_view_course_inquiries" ON "inquiries" CASCADE;--> statement-breakpoint
DROP POLICY "admins_view_all_inquiries" ON "inquiries" CASCADE;--> statement-breakpoint
DROP POLICY "students_update_own_inquiries" ON "inquiries" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_respond_course_inquiries" ON "inquiries" CASCADE;--> statement-breakpoint
DROP POLICY "students_insert_own_inquiries" ON "inquiries" CASCADE;--> statement-breakpoint
DROP TABLE "inquiries" CASCADE;--> statement-breakpoint
DROP POLICY "users_view_own_inquiry_responses" ON "inquiry_responses" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_view_course_responses" ON "inquiry_responses" CASCADE;--> statement-breakpoint
DROP POLICY "admins_view_all_responses" ON "inquiry_responses" CASCADE;--> statement-breakpoint
DROP POLICY "users_update_own_responses" ON "inquiry_responses" CASCADE;--> statement-breakpoint
DROP POLICY "teachers_insert_course_responses" ON "inquiry_responses" CASCADE;--> statement-breakpoint
DROP POLICY "admins_insert_responses" ON "inquiry_responses" CASCADE;--> statement-breakpoint
DROP TABLE "inquiry_responses" CASCADE;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."notification_type";--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('announcement', 'assignment', 'grade', 'system');--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE "public"."notification_type" USING "type"::"public"."notification_type";--> statement-breakpoint
ALTER TABLE "post_notifications" ADD CONSTRAINT "post_notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_notifications" ADD CONSTRAINT "post_notifications_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_notifications" ADD CONSTRAINT "post_notifications_comment_id_post_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "notify_inquiries";--> statement-breakpoint
CREATE POLICY "users_view_own_post_notifications" ON "post_notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "users_update_own_post_notifications" ON "post_notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "users_insert_post_notifications" ON "post_notifications" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (
        actor_id = auth.uid()
        AND (
          (
            event = 'post_created'
            AND comment_id IS NULL
            AND EXISTS (
              SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = actor_id
            )
          )
          OR
          (
            event = 'comment_created'
            AND comment_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM post_comments c
              WHERE c.id = comment_id AND c.author_id = actor_id AND c.post_id = post_id
            )
          )
        )
      );--> statement-breakpoint
DROP TYPE "public"."inquiry_status";