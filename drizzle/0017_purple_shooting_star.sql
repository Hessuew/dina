CREATE TYPE "public"."zoom_link_section" AS ENUM('general_class_lecture', 'discipleship_group');--> statement-breakpoint
CREATE TABLE "zoom_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"section" "zoom_link_section" NOT NULL,
	"course_id" uuid,
	"zoom_url" text NOT NULL,
	"meeting_id" text NOT NULL,
	"passcode" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "zoom_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "zoom_links" ADD CONSTRAINT "zoom_links_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "authenticated_view_zoom_links" ON "zoom_links" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "admins_insert_zoom_links" ON "zoom_links" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "admins_update_zoom_links" ON "zoom_links" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
CREATE POLICY "admins_delete_zoom_links" ON "zoom_links" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');