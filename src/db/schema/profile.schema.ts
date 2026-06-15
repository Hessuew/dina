import {
  boolean,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { gemstoneEnum, userRoleEnum } from './enums.schema'

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull().unique(),
    fullName: text('full_name').notNull(),
    role: userRoleEnum('role').notNull().default('student'),
    bio: text('bio'),
    lecturerTitle: text('lecturer_title'),
    gemstone: gemstoneEnum('gemstone'),
    avatarUrl: text('avatar_url'),
    emailNotifications: boolean('email_notifications').default(true),
    notifyNewAssignments: boolean('notify_new_assignments').default(true),
    notifyGrades: boolean('notify_grades').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // Users can view their own profile
    pgPolicy('users_view_own_profile', {
      for: 'select',
      to: authenticatedRole,
      using: sql`id = auth.uid()`,
    }),
    // Teachers can view all profiles (need to see student info)
    pgPolicy('teachers_view_all_profiles', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'`,
    }),
    // Admins can view all profiles
    pgPolicy('admins_view_all_profiles', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Users can update their own profile
    pgPolicy('users_update_own_profile', {
      for: 'update',
      to: authenticatedRole,
      using: sql`id = auth.uid()`,
      withCheck: sql`id = auth.uid()`,
    }),
    // Admins can update all profiles
    pgPolicy('admins_update_all_profiles', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Users can insert their own profile (for signup)
    pgPolicy('users_insert_own_profile', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`id = auth.uid()`,
    }),
    // Admins can insert profiles
    pgPolicy('admins_insert_profiles', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)
