import {
  boolean,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { gemstoneEnum, userRoleEnum } from './enums.schema'
import { courseTeachers } from './course.schema'
import { submissions } from './assignment.schema'
import { announcements } from './announcement.schema'
import { mediaLibrary } from './media.schema'
import { notifications } from './notification.schema'
import { invitations } from './invitation.schema'
import {
  postCommentReactions,
  postComments,
  postNotifications,
  postReactions,
  posts,
} from './post.schema'
import { enrollmentReviewerAssignments } from './enrollment.schema'

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
    resetTokenHash: text('reset_token_hash'),
    resetTokenExpiresAt: timestamp('reset_token_expires_at'),
    resetTokenAttempts: integer('reset_token_attempts').default(0).notNull(),
    lastResetRequestAt: timestamp('last_reset_request_at'),
    pendingEmail: text('pending_email'),
    emailChangeTokenHash: text('email_change_token_hash'),
    emailChangeTokenExpiresAt: timestamp('email_change_token_expires_at'),
    emailChangeTokenAttempts: integer('email_change_token_attempts')
      .default(0)
      .notNull(),
    lastEmailChangeRequestAt: timestamp('last_email_change_request_at'),
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

export const profilesRelations = relations(profiles, ({ many }) => ({
  courseTeachers: many(courseTeachers),
  submissions: many(submissions),
  announcements: many(announcements),
  mediaUploads: many(mediaLibrary),
  notifications: many(notifications),
  invitations: many(invitations),
  posts: many(posts),
  postComments: many(postComments),
  postNotifications: many(postNotifications),
  postReactions: many(postReactions),
  postCommentReactions: many(postCommentReactions),
  reviewerAssignments: many(enrollmentReviewerAssignments),
}))
