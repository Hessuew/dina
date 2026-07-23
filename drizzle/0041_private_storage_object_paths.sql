ALTER TABLE "profiles" RENAME COLUMN "avatar_url" TO "avatar_path";
ALTER TABLE "courses" RENAME COLUMN "thumbnail_url" TO "thumbnail_path";
ALTER TABLE "media_library" RENAME COLUMN "thumbnail_url" TO "thumbnail_path";

ALTER TABLE "media_library" ADD COLUMN "external_url" text;
ALTER TABLE "media_library" ADD COLUMN "file_path" text;

UPDATE "profiles"
SET "avatar_path" = regexp_replace(
  "avatar_path",
  '^.*/avatars/([^?]+).*$',
  '\1'
)
WHERE "avatar_path" LIKE '%/avatars/%';

UPDATE "courses"
SET "thumbnail_path" = regexp_replace(
  "thumbnail_path",
  '^.*/course-thumbnails/([^?]+).*$',
  '\1'
)
WHERE "thumbnail_path" LIKE '%/course-thumbnails/%';

UPDATE "media_library"
SET "thumbnail_path" = regexp_replace(
  "thumbnail_path",
  '^.*/media-thumbnails/([^?]+).*$',
  '\1'
)
WHERE "thumbnail_path" LIKE '%/media-thumbnails/%';

UPDATE "media_library"
SET
  "external_url" = CASE WHEN "file_type" = 'video' THEN "file_url" END,
  "file_path" = CASE
    WHEN "file_type" <> 'video' THEN regexp_replace(
      "file_url",
      '^.*/media-library/([^?]+).*$',
      '\1'
    )
  END;

ALTER TABLE "media_library" DROP COLUMN "file_url";
ALTER TABLE "media_library" ADD CONSTRAINT "media_library_source_check" CHECK (
  ("file_type" = 'video' AND "external_url" IS NOT NULL AND "file_path" IS NULL)
  OR
  ("file_type" <> 'video' AND "file_path" IS NOT NULL AND "external_url" IS NULL)
);
