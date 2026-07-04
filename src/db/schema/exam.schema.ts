import {
  boolean,
  check,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import {
  examAttemptStatusEnum,
  examQuestionTypeEnum,
  examStatusEnum,
} from './enums.schema'
import { profiles } from './profile.schema'

const isAdminOrTeacher = sql`(SELECT role FROM profiles WHERE id = auth.uid()) IN ('teacher', 'admin')`
const isStudent = sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'student'`

/**
 * Standalone timed exam authored by a teacher or admin. Questions are frozen
 * once status flips to 'published'; students may start an attempt between
 * opensAt and closesAt and always get the full duration once started.
 */
export const exams = pgTable(
  'exams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    durationMinutes: integer('duration_minutes').notNull().default(30),
    opensAt: timestamp('opens_at').notNull(),
    closesAt: timestamp('closes_at').notNull(),
    status: examStatusEnum('status').notNull().default('draft'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    check('exams_duration_positive', sql`duration_minutes > 0`),
    check('exams_window_valid', sql`closes_at > opens_at`),
    index('exams_status_opens_at_idx').on(table.status, table.opensAt),
    pgPolicy('teachers_admins_view_all_exams', {
      for: 'select',
      to: authenticatedRole,
      using: isAdminOrTeacher,
    }),
    pgPolicy('students_view_published_exams', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${isStudent} AND status = 'published'`,
    }),
    pgPolicy('teachers_admins_insert_exams', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: isAdminOrTeacher,
    }),
    pgPolicy('teachers_admins_update_exams', {
      for: 'update',
      to: authenticatedRole,
      using: isAdminOrTeacher,
      withCheck: isAdminOrTeacher,
    }),
    pgPolicy('teachers_admins_delete_exams', {
      for: 'delete',
      to: authenticatedRole,
      using: isAdminOrTeacher,
    }),
  ],
)

export const examQuestions = pgTable(
  'exam_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    type: examQuestionTypeEnum('type').notNull(),
    prompt: text('prompt').notNull(),
    orderIndex: integer('order_index').notNull(),
    points: integer('points').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    check('exam_questions_points_positive', sql`points > 0`),
    unique('exam_questions_exam_order_unique').on(
      table.examId,
      table.orderIndex,
    ),
    pgPolicy('teachers_admins_manage_exam_questions', {
      for: 'all',
      to: authenticatedRole,
      using: isAdminOrTeacher,
      withCheck: isAdminOrTeacher,
    }),
    pgPolicy('students_view_published_exam_questions', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${isStudent} AND exam_id IN (SELECT id FROM exams WHERE status = 'published')`,
    }),
  ],
)

/**
 * Options for multiple-choice questions. The is_correct flag must never reach
 * a student before grading: the student-facing service projects it away
 * (redacted-view precedent); these RLS policies are the backstop, not the
 * boundary, since RLS cannot hide columns.
 */
export const examQuestionOptions = pgTable(
  'exam_question_options',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => examQuestions.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    orderIndex: integer('order_index').notNull(),
    isCorrect: boolean('is_correct').notNull().default(false),
  },
  (table) => [
    unique('exam_question_options_question_order_unique').on(
      table.questionId,
      table.orderIndex,
    ),
    // At most one correct option per question at the DB level; "exactly one"
    // is validated at publish time.
    uniqueIndex('exam_question_options_one_correct')
      .on(table.questionId)
      .where(sql`is_correct`),
    pgPolicy('teachers_admins_manage_exam_question_options', {
      for: 'all',
      to: authenticatedRole,
      using: isAdminOrTeacher,
      withCheck: isAdminOrTeacher,
    }),
    pgPolicy('students_view_published_exam_question_options', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${isStudent} AND question_id IN (
        SELECT q.id FROM exam_questions q
        JOIN exams e ON q.exam_id = e.id
        WHERE e.status = 'published'
      )`,
    }),
  ],
)

/**
 * One attempt per (exam, student) — the unique constraint is the race guard.
 * deadline_at is denormalized at start (started_at + duration) so later exam
 * edits can never move a live deadline; it is the single source of truth for
 * time-limit enforcement.
 */
export const examAttempts = pgTable(
  'exam_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: examAttemptStatusEnum('status').notNull().default('in_progress'),
    startedAt: timestamp('started_at').defaultNow().notNull(),
    deadlineAt: timestamp('deadline_at').notNull(),
    submittedAt: timestamp('submitted_at'),
    gradedAt: timestamp('graded_at'),
    gradedBy: uuid('graded_by').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    autoScore: integer('auto_score'),
    manualScore: integer('manual_score'),
    totalScore: integer('total_score'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('exam_attempts_exam_student_unique').on(
      table.examId,
      table.studentId,
    ),
    index('exam_attempts_exam_status_idx').on(table.examId, table.status),
    pgPolicy('students_view_own_exam_attempts', {
      for: 'select',
      to: authenticatedRole,
      using: sql`student_id = auth.uid()`,
    }),
    pgPolicy('students_insert_own_exam_attempts', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`student_id = auth.uid()`,
    }),
    pgPolicy('students_update_own_in_progress_exam_attempts', {
      for: 'update',
      to: authenticatedRole,
      using: sql`student_id = auth.uid() AND status = 'in_progress'`,
      withCheck: sql`student_id = auth.uid()`,
    }),
    pgPolicy('teachers_admins_view_all_exam_attempts', {
      for: 'select',
      to: authenticatedRole,
      using: isAdminOrTeacher,
    }),
    pgPolicy('teachers_admins_update_exam_attempts', {
      for: 'update',
      to: authenticatedRole,
      using: isAdminOrTeacher,
      withCheck: isAdminOrTeacher,
    }),
  ],
)

/**
 * One row per (attempt, question) — the unique constraint enables the
 * autosave upsert. Saved answers are the durable state of record: at the
 * deadline whatever is saved becomes the submission.
 */
export const examAnswers = pgTable(
  'exam_answers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => examAttempts.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => examQuestions.id, { onDelete: 'cascade' }),
    selectedOptionId: uuid('selected_option_id').references(
      () => examQuestionOptions.id,
      { onDelete: 'set null' },
    ),
    textAnswer: text('text_answer'),
    isCorrect: boolean('is_correct'),
    awardedPoints: integer('awarded_points'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('exam_answers_attempt_question_unique').on(
      table.attemptId,
      table.questionId,
    ),
    pgPolicy('students_view_own_exam_answers', {
      for: 'select',
      to: authenticatedRole,
      using: sql`attempt_id IN (SELECT id FROM exam_attempts WHERE student_id = auth.uid())`,
    }),
    pgPolicy('students_write_own_in_progress_exam_answers', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`attempt_id IN (SELECT id FROM exam_attempts WHERE student_id = auth.uid() AND status = 'in_progress')`,
    }),
    pgPolicy('students_update_own_in_progress_exam_answers', {
      for: 'update',
      to: authenticatedRole,
      using: sql`attempt_id IN (SELECT id FROM exam_attempts WHERE student_id = auth.uid() AND status = 'in_progress')`,
      withCheck: sql`attempt_id IN (SELECT id FROM exam_attempts WHERE student_id = auth.uid() AND status = 'in_progress')`,
    }),
    pgPolicy('teachers_admins_view_all_exam_answers', {
      for: 'select',
      to: authenticatedRole,
      using: isAdminOrTeacher,
    }),
    pgPolicy('teachers_admins_grade_exam_answers', {
      for: 'update',
      to: authenticatedRole,
      using: isAdminOrTeacher,
      withCheck: isAdminOrTeacher,
    }),
  ],
)
