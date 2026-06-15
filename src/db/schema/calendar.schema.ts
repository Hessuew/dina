import { pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { calendarEventCategoryEnum } from './enums.schema'
import { courses } from './course.schema'

export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'cascade',
    }),
    title: text('title').notNull(),
    description: text('description'),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time').notNull(),
    location: text('location'),
    zoomLink: text('zoom_link'),
    category: calendarEventCategoryEnum('category'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // All authenticated users can view events
    pgPolicy('authenticated_view_events', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    // Teachers can update events in their courses
    pgPolicy('teachers_update_course_events', {
      for: 'update',
      to: authenticatedRole,
      using: sql`
        course_id IS NULL OR course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
      withCheck: sql`
        course_id IS NULL OR course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can update all events
    pgPolicy('admins_update_all_events', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Teachers can create events in their courses
    pgPolicy('teachers_create_course_events', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        course_id IS NULL OR course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can create events
    pgPolicy('admins_create_events', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)
