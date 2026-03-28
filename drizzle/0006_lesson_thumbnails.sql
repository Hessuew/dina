ALTER TABLE "lessons" ADD COLUMN "thumbnail_url" text;

-- Create index for faster queries if needed
-- CREATE INDEX "lessons_thumbnail_url_idx" ON "lessons"("thumbnail_url");
