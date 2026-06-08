import {
  boolean,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { profiles } from './profile.schema'
import { assignments } from './assignment.schema'
import { announcements } from './announcement.schema'
import { mediaLibrary } from './media.schema'
import { calendarEvents } from './calendar.schema'
import { zoomLinks } from './zoom.schema'
import { posts } from './post.schema'

export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    isPublished: boolean('is_published').default(false),
    orderIndex: integer('order_index').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // All authenticated users can view courses
    pgPolicy('authenticated_view_courses', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    // Teachers can only update courses they're assigned to
    pgPolicy('teachers_update_assigned_courses', {
      for: 'update',
      to: authenticatedRole,
      using: sql`
        id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
      withCheck: sql`
        id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can update all courses
    pgPolicy('admins_update_all_courses', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Teachers can only insert courses they're assigned to
    pgPolicy('teachers_insert_assigned_courses', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can insert courses
    pgPolicy('admins_insert_courses', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const courseTeachers = pgTable(
  'course_teachers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // Peer-teacher lookup queries filter course_teachers by teacher_id.
    index('course_teachers_teacher_id_idx').on(table.teacherId),
    // Teachers can view their own course assignments
    pgPolicy('teachers_view_own_assignments', {
      for: 'select',
      to: authenticatedRole,
      using: sql`teacher_id = auth.uid()`,
    }),
    // Admins can view all course assignments
    pgPolicy('admins_view_all_assignments', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Teachers can only update their own assignments
    pgPolicy('teachers_update_own_assignments', {
      for: 'update',
      to: authenticatedRole,
      using: sql`teacher_id = auth.uid()`,
      withCheck: sql`teacher_id = auth.uid()`,
    }),
    // Admins can update all assignments
    pgPolicy('admins_update_all_assignments', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Admins can insert assignments
    pgPolicy('admins_insert_assignments', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content'),
    videoUrl: text('video_url'),
    thumbnailUrl: text('thumbnail_url'),
    duration: integer('duration'),
    orderIndex: integer('order_index').notNull().default(0),
    isPublished: boolean('is_published').default(false),
    zoomMeetingId: text('zoom_meeting_id'),
    zoomPassword: text('zoom_password'),
    scheduledTime: timestamp('scheduled_time'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // All authenticated users can view lessons
    pgPolicy('authenticated_view_lessons', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    // Teachers can only update lessons in their assigned courses
    pgPolicy('teachers_update_assigned_lessons', {
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
    // Admins can update all lessons
    pgPolicy('admins_update_all_lessons', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Teachers can only insert lessons in their assigned courses
    pgPolicy('teachers_insert_assigned_lessons', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        course_id IN (
          SELECT course_id FROM course_teachers 
          WHERE teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can insert lessons
    pgPolicy('admins_insert_lessons', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const lessonProgress = pgTable(
  'lesson_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    completed: boolean('completed').default(false),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // Students can view their own progress
    pgPolicy('students_view_own_progress', {
      for: 'select',
      to: authenticatedRole,
      using: sql`student_id = auth.uid()`,
    }),
    // Teachers can view progress for students in their courses
    pgPolicy('teachers_view_course_progress', {
      for: 'select',
      to: authenticatedRole,
      using: sql`
        lesson_id IN (
          SELECT l.id FROM lessons l
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can view all progress
    pgPolicy('admins_view_all_progress', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Students can update their own progress
    pgPolicy('students_update_own_progress', {
      for: 'update',
      to: authenticatedRole,
      using: sql`student_id = auth.uid()`,
      withCheck: sql`student_id = auth.uid()`,
    }),
    // Students can insert their own progress
    pgPolicy('students_insert_own_progress', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`student_id = auth.uid()`,
    }),
  ],
)

export const coursesRelations = relations(courses, ({ many }) => ({
  courseTeachers: many(courseTeachers),
  lessons: many(lessons),
  announcements: many(announcements),
  mediaFiles: many(mediaLibrary),
  calendarEvents: many(calendarEvents),
  zoomLinks: many(zoomLinks),
  posts: many(posts),
}))

export const courseTeachersRelations = relations(courseTeachers, ({ one }) => ({
  course: one(courses, {
    fields: [courseTeachers.courseId],
    references: [courses.id],
  }),
  teacher: one(profiles, {
    fields: [courseTeachers.teacherId],
    references: [profiles.id],
  }),
}))

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
  progress: many(lessonProgress),
  assignments: many(assignments),
}))

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  student: one(profiles, {
    fields: [lessonProgress.studentId],
    references: [profiles.id],
  }),
  lesson: one(lessons, {
    fields: [lessonProgress.lessonId],
    references: [lessons.id],
  }),
}))
