import {
  index,
  pgPolicy,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { profiles } from './profile.schema'

// Staff = admins (all columns) and teachers (own column). Reused across policies.
const staffSelect = sql`(SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')`
const adminOrOwnTeacher = sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR teacher_id = auth.uid()`

// One row per teacher who disciples students: holds the teacher's monthly
// all-disciples "group" meeting anchor. Group membership itself is implicit
// (every assignment that points at this teacher).
export const discipleshipGroups = pgTable(
  'discipleship_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id')
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    anchorAt: timestamp('anchor_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    pgPolicy('staff_view_discipleship_groups', {
      for: 'select',
      to: authenticatedRole,
      using: staffSelect,
    }),
    pgPolicy('staff_insert_discipleship_groups', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: adminOrOwnTeacher,
    }),
    pgPolicy('staff_update_discipleship_groups', {
      for: 'update',
      to: authenticatedRole,
      using: adminOrOwnTeacher,
      withCheck: adminOrOwnTeacher,
    }),
    pgPolicy('staff_delete_discipleship_groups', {
      for: 'delete',
      to: authenticatedRole,
      using: adminOrOwnTeacher,
    }),
  ],
)

// A pair of two students under one teacher, with the pair's monthly meeting anchor.
export const discipleshipPairs = pgTable(
  'discipleship_pairs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    anchorAt: timestamp('anchor_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('discipleship_pairs_teacher_id_idx').on(table.teacherId),
    pgPolicy('staff_view_discipleship_pairs', {
      for: 'select',
      to: authenticatedRole,
      using: staffSelect,
    }),
    pgPolicy('staff_insert_discipleship_pairs', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: adminOrOwnTeacher,
    }),
    pgPolicy('staff_update_discipleship_pairs', {
      for: 'update',
      to: authenticatedRole,
      using: adminOrOwnTeacher,
      withCheck: adminOrOwnTeacher,
    }),
    pgPolicy('staff_delete_discipleship_pairs', {
      for: 'delete',
      to: authenticatedRole,
      using: adminOrOwnTeacher,
    }),
  ],
)

// Core row: a student is discipled by one teacher. `pairId` links the student into
// a pair (nullable); `anchorAt` is the student's individual monthly meeting time.
export const discipleshipAssignments = pgTable(
  'discipleship_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: uuid('student_id')
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    pairId: uuid('pair_id').references(() => discipleshipPairs.id, {
      onDelete: 'set null',
    }),
    anchorAt: timestamp('anchor_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('discipleship_assignments_teacher_id_idx').on(table.teacherId),
    index('discipleship_assignments_pair_id_idx').on(table.pairId),
    pgPolicy('staff_view_discipleship_assignments', {
      for: 'select',
      to: authenticatedRole,
      using: staffSelect,
    }),
    pgPolicy('staff_insert_discipleship_assignments', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: adminOrOwnTeacher,
    }),
    pgPolicy('staff_update_discipleship_assignments', {
      for: 'update',
      to: authenticatedRole,
      using: adminOrOwnTeacher,
      withCheck: adminOrOwnTeacher,
    }),
    pgPolicy('staff_delete_discipleship_assignments', {
      for: 'delete',
      to: authenticatedRole,
      using: adminOrOwnTeacher,
    }),
  ],
)
