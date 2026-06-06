import {
  boolean,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { profiles } from './profile.schema'
import { courses } from './course.schema'

export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'cascade',
    }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => profiles.id),
    title: text('title').notNull(),
    content: text('content').notNull(),
    isGlobal: boolean('is_global').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // All authenticated users can view announcements
    pgPolicy('authenticated_view_announcements', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    // Users can update their own announcements
    pgPolicy('users_update_own_announcements', {
      for: 'update',
      to: authenticatedRole,
      using: sql`author_id = auth.uid()`,
      withCheck: sql`author_id = auth.uid()`,
    }),
    // Teachers can create announcements for their courses
    pgPolicy('teachers_insert_course_announcements', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        (is_global = false AND course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )) OR (is_global = true AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
      `,
    }),
    // Admins can create global announcements
    pgPolicy('admins_insert_global_announcements', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(profiles, {
    fields: [announcements.authorId],
    references: [profiles.id],
  }),
  course: one(courses, {
    fields: [announcements.courseId],
    references: [courses.id],
  }),
}))
