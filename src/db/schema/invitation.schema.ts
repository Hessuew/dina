import {
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { invitationStatusEnum, userRoleEnum } from './enums.schema'
import { profiles } from './profile.schema'

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    role: userRoleEnum('role').notNull(),
    token: text('token').notNull().unique(),
    status: invitationStatusEnum('status').notNull().default('pending'),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => profiles.id),
    invitedAt: timestamp('invited_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    otpHash: text('otp_hash'),
    otpExpiresAt: timestamp('otp_expires_at'),
    otpAttempts: integer('otp_attempts').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // Public access for invitation token lookup during signup
    pgPolicy('public_view_invitation_by_token', {
      for: 'select',
      to: 'public',
      using: sql`token IS NOT NULL AND status = 'pending' AND expires_at > NOW()`,
    }),
    // Public access for OTP verification during signup
    pgPolicy('public_update_otp_verification', {
      for: 'update',
      to: 'public',
      using: sql`token IS NOT NULL AND status = 'pending' AND expires_at > NOW()`,
      withCheck: sql`token IS NOT NULL AND status = 'pending' AND expires_at > NOW()`,
    }),
    // Authenticated users can view invitations they created
    pgPolicy('users_view_own_invitations', {
      for: 'select',
      to: authenticatedRole,
      using: sql`invited_by = auth.uid()`,
    }),
    // Admins can view all invitations
    pgPolicy('admins_view_all_invitations', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Admins can update all invitations
    pgPolicy('admins_update_all_invitations', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    // Admins and teachers can insert invitations
    pgPolicy('staff_insert_invitations', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'teacher')`,
    }),
  ],
)
