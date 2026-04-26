CREATE TABLE "post_comment_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_comment_reactions_comment_user_unique" UNIQUE("comment_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "post_comment_reactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "course_id" uuid;--> statement-breakpoint
ALTER TABLE "post_comment_reactions" ADD CONSTRAINT "post_comment_reactions_comment_id_post_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."post_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comment_reactions" ADD CONSTRAINT "post_comment_reactions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "authenticated_view_post_comment_reactions" ON "post_comment_reactions" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "users_insert_own_post_comment_reactions" ON "post_comment_reactions" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "users_update_own_post_comment_reactions" ON "post_comment_reactions" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "users_delete_own_post_comment_reactions" ON "post_comment_reactions" AS PERMISSIVE FOR DELETE TO "authenticated" USING (user_id = auth.uid());