import {
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { zoomLinkSectionEnum } from './enums.schema'
import { courses } from './course.schema'

export const zoomLinks = pgTable(
  'zoom_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    section: zoomLinkSectionEnum('section').notNull(),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'set null',
    }),
    zoomUrl: text('zoom_url').notNull(),
    meetingId: text('meeting_id').notNull(),
    passcode: text('passcode').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    pgPolicy('authenticated_view_zoom_links', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy('admins_insert_zoom_links', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('admins_update_zoom_links', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('admins_delete_zoom_links', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const zoomLinksRelations = relations(zoomLinks, ({ one }) => ({
  course: one(courses, {
    fields: [zoomLinks.courseId],
    references: [courses.id],
  }),
}))
