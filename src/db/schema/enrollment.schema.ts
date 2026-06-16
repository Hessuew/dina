import {
  boolean,
  check,
  index,
  integer,
  pgPolicy,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import {
  enrollmentAdmissionCategoryEnum,
  enrollmentGenderEnum,
  enrollmentStatusEnum,
} from './enums.schema'
import { invitations } from './invitation.schema'
import { profiles } from './profile.schema'
import { courses } from './course.schema'

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fullLegalName: text('full_legal_name').notNull(),
    preferredName: text('preferred_name'),
    email: text('email').notNull(),
    yearOfBirth: integer('year_of_birth').notNull(),
    gender: enrollmentGenderEnum('gender').notNull(),
    nationalityCitizenship: text('nationality_citizenship'),
    phoneWhatsApp: text('phone_whatsapp').notNull(),
    currentCity: text('current_city'),
    currentCountry: text('current_country'),
    churchAffiliations: text('church_affiliations'),
    aboutYourself: text('about_yourself').notNull(),
    expectationsAlignment: text('expectations_alignment').notNull(),
    status: enrollmentStatusEnum('status').notNull().default('pending'),
    invitationSent: boolean('invitation_sent').notNull().default(false),
    specialCase: boolean('special_case').notNull().default(false),
    invitationId: uuid('invitation_id').references(() => invitations.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    // Default list sort is by created_at.
    index('enrollments_created_at_idx').on(table.createdAt),
    // Trigram GIN indexes make the `ilike '%search%'` table search index-usable
    // (requires the pg_trgm extension, created in the migration).
    index('enrollments_full_legal_name_trgm_idx').using(
      'gin',
      sql`${table.fullLegalName} gin_trgm_ops`,
    ),
    index('enrollments_email_trgm_idx').using(
      'gin',
      sql`${table.email} gin_trgm_ops`,
    ),
    pgPolicy('public_insert_enrollments', {
      for: 'insert',
      to: 'public',
      withCheck: sql`true`,
    }),
    pgPolicy('admins_view_all_enrollments', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('admins_update_all_enrollments', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('admins_delete_all_enrollments', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

export const enrollmentEvaluations = pgTable(
  'enrollment_evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    evaluatorId: uuid('evaluator_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    score: smallint('score'),
    admissionCategory: enrollmentAdmissionCategoryEnum('admission_category'),
    note: text('note'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    unique('enrollment_evaluations_enrollment_evaluator_unique').on(
      table.enrollmentId,
      table.evaluatorId,
    ),
    check(
      'enrollment_evaluations_score_range',
      sql`${table.score} BETWEEN 0 AND 4`,
    ),
    check(
      'enrollment_evaluations_admission_category_score',
      sql`${table.admissionCategory} IS NULL OR ${table.score} IN (3, 4)`,
    ),
    // Teacher-users and admins (Evaluators) may read all evaluations.
    pgPolicy('staff_view_evaluations', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')`,
    }),
    // Evaluators may only write their own evaluation row.
    pgPolicy('staff_insert_own_evaluations', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`evaluator_id = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')`,
    }),
    pgPolicy('staff_update_own_evaluations', {
      for: 'update',
      to: authenticatedRole,
      using: sql`evaluator_id = auth.uid()`,
      withCheck: sql`evaluator_id = auth.uid()`,
    }),
  ],
)

export const enrollmentReviewerAssignments = pgTable(
  'enrollment_reviewer_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .unique()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').references(() => courses.id, {
      onDelete: 'set null',
    }),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  },
  (table) => [
    index('enrollment_reviewer_assignments_reviewer_enrollment_idx').on(
      table.reviewerId,
      table.enrollmentId,
    ),
    pgPolicy('admins_view_all_reviewer_assignments', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('teachers_view_own_reviewer_assignments', {
      for: 'select',
      to: authenticatedRole,
      using: sql`reviewer_id = auth.uid() AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'`,
    }),
    pgPolicy('admins_insert_reviewer_assignments', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('admins_update_reviewer_assignments', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('admins_delete_reviewer_assignments', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)
