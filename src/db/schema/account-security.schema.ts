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
import { profiles } from './profile.schema'

export const accountSecurity = pgTable(
  'account_security',
  {
    profileId: uuid('profile_id')
      .primaryKey()
      .references(() => profiles.id, { onDelete: 'cascade' }),
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
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (_table) => [
    // Users can view their own security row; all writes are server-side only
    pgPolicy('users_view_own_account_security', {
      for: 'select',
      to: authenticatedRole,
      using: sql`profile_id = auth.uid()`,
    }),
  ],
)
