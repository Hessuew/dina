import {
  boolean,
  check,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { mediaTypeEnum } from './enums.schema'
import { profiles } from './profile.schema'
import { courses } from './course.schema'

const mediaLibraryPolicies = [
  pgPolicy('authenticated_view_media', {
    for: 'select',
    to: authenticatedRole,
    using: sql`
      is_published = true
      OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
    `,
  }),
  pgPolicy('uploaders_update_own_media', {
    for: 'update',
    to: authenticatedRole,
    using: sql`uploader_id = auth.uid()`,
    withCheck: sql`uploader_id = auth.uid()`,
  }),
  pgPolicy('teachers_update_course_media', {
    for: 'update',
    to: authenticatedRole,
    using: sql`
      course_id IN (
        SELECT course_id FROM course_teachers
        WHERE teacher_id = auth.uid()
      )
    `,
    withCheck: sql`
      course_id IN (
        SELECT course_id FROM course_teachers
        WHERE teacher_id = auth.uid()
      )
    `,
  }),
  pgPolicy('admins_update_all_media', {
    for: 'update',
    to: authenticatedRole,
    using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
  }),
  pgPolicy('uploaders_delete_own_media', {
    for: 'delete',
    to: authenticatedRole,
    using: sql`uploader_id = auth.uid()`,
  }),
  pgPolicy('admins_delete_all_media', {
    for: 'delete',
    to: authenticatedRole,
    using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
  }),
  pgPolicy('users_upload_own_media', {
    for: 'insert',
    to: authenticatedRole,
    withCheck: sql`
      uploader_id = auth.uid()
      AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
    `,
  }),
  pgPolicy('teachers_upload_course_media', {
    for: 'insert',
    to: authenticatedRole,
    withCheck: sql`
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
      AND (course_id IS NULL OR course_id IN (
        SELECT course_id FROM course_teachers
        WHERE teacher_id = auth.uid()
      ))
    `,
  }),
]

export const mediaLibrary = pgTable(
  'media_library',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    uploaderId: uuid('uploader_id')
      .notNull()
      .references(() => profiles.id),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'cascade',
    }),
    title: text('title').notNull(),
    category: text('category').notNull().default('General'),
    description: text('description'),
    externalUrl: text('external_url'),
    filePath: text('file_path'),
    fileType: mediaTypeEnum('file_type').notNull(),
    fileSize: integer('file_size'),
    thumbnailUrl: text('thumbnail_path'),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    check(
      'media_library_source_check',
      sql`(
        (${table.fileType} = 'video' AND ${table.externalUrl} IS NOT NULL AND ${table.filePath} IS NULL)
        OR
        (${table.fileType} <> 'video' AND ${table.filePath} IS NOT NULL AND ${table.externalUrl} IS NULL)
      )`,
    ),
    ...mediaLibraryPolicies,
  ],
)
