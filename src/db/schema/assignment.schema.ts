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
import { assignmentStatusEnum, submissionStatusEnum } from './enums.schema'
import { lessons } from './course.schema'
import { profiles } from './profile.schema'

export const assignments = pgTable(
  'assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    dueDate: timestamp('due_date').notNull(),
    maxGrade: integer('max_grade').default(100),
    status: assignmentStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // All authenticated users can view assignments
    pgPolicy('authenticated_view_assignments', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    // Teachers can only update assignments in their assigned courses
    pgPolicy('teachers_update_assigned_assignments', {
      for: 'update',
      to: authenticatedRole,
      using: sql`
        lesson_id IN (
          SELECT l.id FROM lessons l
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
      withCheck: sql`
        lesson_id IN (
          SELECT l.id FROM lessons l
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can update all assignments
    pgPolicy('admins_update_all_assignments', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Teachers can only insert assignments in their assigned courses
    pgPolicy('teachers_insert_assigned_assignments', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`
        lesson_id IN (
          SELECT l.id FROM lessons l
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can insert assignments
    pgPolicy('admins_insert_assignments', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    content: text('content'),
    fileUrl: text('file_url'),
    status: submissionStatusEnum('status').notNull().default('draft'),
    grade: integer('grade'),
    feedback: text('feedback'),
    submittedAt: timestamp('submitted_at'),
    gradedAt: timestamp('graded_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // Students can view their own submissions
    pgPolicy('students_view_own_submissions', {
      for: 'select',
      to: authenticatedRole,
      using: sql`student_id = auth.uid()`,
    }),
    // Teachers can view submissions in their courses
    pgPolicy('teachers_view_course_submissions', {
      for: 'select',
      to: authenticatedRole,
      using: sql`
        assignment_id IN (
          SELECT a.id FROM assignments a
          JOIN lessons l ON a.lesson_id = l.id
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
    }),
    // Admins can view all submissions
    pgPolicy('admins_view_all_submissions', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Students can update their own submissions
    pgPolicy('students_update_own_submissions', {
      for: 'update',
      to: authenticatedRole,
      using: sql`student_id = auth.uid()`,
      withCheck: sql`student_id = auth.uid()`,
    }),
    // Teachers can grade submissions in their courses
    pgPolicy('teachers_grade_course_submissions', {
      for: 'update',
      to: authenticatedRole,
      using: sql`
        assignment_id IN (
          SELECT a.id FROM assignments a
          JOIN lessons l ON a.lesson_id = l.id
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
      withCheck: sql`
        assignment_id IN (
          SELECT a.id FROM assignments a
          JOIN lessons l ON a.lesson_id = l.id
          JOIN course_teachers ct ON l.course_id = ct.course_id
          WHERE ct.teacher_id = auth.uid()
        )
      `,
    }),
    // Students can insert their own submissions
    pgPolicy('students_insert_own_submissions', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`student_id = auth.uid()`,
    }),
  ],
)

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  lesson: one(lessons, {
    fields: [assignments.lessonId],
    references: [lessons.id],
  }),
  submissions: many(submissions),
}))

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(profiles, {
    fields: [submissions.studentId],
    references: [profiles.id],
  }),
}))
