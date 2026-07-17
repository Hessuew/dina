import {
  index,
  pgPolicy,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { courses, lessons } from './course.schema'
import { profiles } from './profile.schema'

/**
 * One Attendance Session per Lesson (lifetime). Re-open reuses this row:
 * sets openedAt/closesAt again; prior presents stay.
 * Open window: closesAt is non-null and closesAt > now.
 */
export const attendanceSessions = pgTable(
  'attendance_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    openedAt: timestamp('opened_at'),
    closesAt: timestamp('closes_at'),
    openedBy: uuid('opened_by').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('attendance_sessions_lesson_id_unique').on(table.lessonId),
    index('attendance_sessions_course_id_idx').on(table.courseId),
    index('attendance_sessions_course_closes_at_idx').on(
      table.courseId,
      table.closesAt,
    ),
    pgPolicy('authenticated_view_attendance_sessions', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    pgPolicy('teachers_manage_assigned_attendance_sessions', {
      for: 'all',
      to: authenticatedRole,
      using: sql`
        course_id IN (
          SELECT course_id FROM course_teachers
          WHERE teacher_id = auth.uid()
        )
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
      `,
      withCheck: sql`
        course_id IN (
          SELECT course_id FROM course_teachers
          WHERE teacher_id = auth.uid()
        )
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
      `,
    }),
  ],
)

/** Present-only marks. No row = not present. Unique per session+student. */
export const attendancePresents = pgTable(
  'attendance_presents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    checkedInAt: timestamp('checked_in_at').defaultNow().notNull(),
  },
  (table) => [
    unique('attendance_presents_session_student_unique').on(
      table.sessionId,
      table.studentId,
    ),
    index('attendance_presents_student_id_idx').on(table.studentId),
    pgPolicy('students_view_own_attendance_presents', {
      for: 'select',
      to: authenticatedRole,
      using: sql`
        student_id = auth.uid()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')
      `,
    }),
    pgPolicy('students_insert_own_attendance_presents', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        student_id = auth.uid()
        AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'student'
      `,
    }),
  ],
)
