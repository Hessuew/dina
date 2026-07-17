import {
  check,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { zoomLinkSectionEnum } from './enums.schema'
import { profiles } from './profile.schema'

export const zoomLinks = pgTable(
  'zoom_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    section: zoomLinkSectionEnum('section').notNull(),
    teacherId: uuid('teacher_id').references(() => profiles.id, {
      onDelete: 'cascade',
    }),
    zoomUrl: text('zoom_url').notNull(),
    meetingId: text('meeting_id').notNull(),
    passcode: text('passcode').notNull(),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('zoom_links_teacher_id_idx').on(table.teacherId),
    check(
      'zoom_links_section_owner_check',
      sql`(section = 'general_class_lecture' AND teacher_id IS NULL) OR (section = 'teacher' AND teacher_id IS NOT NULL)`,
    ),
    pgPolicy('authenticated_view_visible_zoom_links', {
      for: 'select',
      to: authenticatedRole,
      using: sql`
        section = 'general_class_lecture'
        OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
        OR teacher_id = public.current_discipleship_teacher_id()
      `,
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
