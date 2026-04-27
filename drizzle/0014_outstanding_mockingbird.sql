ALTER TABLE "media_library" ADD COLUMN "category" text DEFAULT 'General' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_library" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "media_library" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE POLICY "uploaders_delete_own_media" ON "media_library" AS PERMISSIVE FOR DELETE TO "authenticated" USING (uploader_id = auth.uid());--> statement-breakpoint
CREATE POLICY "admins_delete_all_media" ON "media_library" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');--> statement-breakpoint
ALTER POLICY "authenticated_view_media" ON "media_library" TO authenticated USING (
        is_published = true
        OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
      );--> statement-breakpoint
ALTER POLICY "users_upload_own_media" ON "media_library" TO authenticated WITH CHECK (
        uploader_id = auth.uid()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
      );--> statement-breakpoint
ALTER POLICY "teachers_upload_course_media" ON "media_library" TO authenticated WITH CHECK (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
        AND (course_id IS NULL OR course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        ))
      );