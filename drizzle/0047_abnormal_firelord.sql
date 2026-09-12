CREATE INDEX "post_comments_post_created_at_idx" ON "post_comments" USING btree ("post_id","created_at","id");--> statement-breakpoint
CREATE INDEX "post_notifications_user_read_created_at_idx" ON "post_notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "posts_course_created_at_idx" ON "posts" USING btree ("course_id","created_at","id");