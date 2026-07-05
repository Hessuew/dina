import {
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { emailMessageStatusEnum, emailTypeEnum } from './enums.schema'
import { enrollments } from './enrollment.schema'
import { profiles } from './profile.schema'

/**
 * Outbound bulk email campaign attempt log. One row per recipient attempt
 * (sent or failed); existing one-off invitation emails are intentionally not
 * backfilled or logged here.
 */
export const emailMessages = pgTable(
  'email_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    recipientEmail: text('recipient_email').notNull(),
    emailType: emailTypeEnum('email_type').notNull(),
    status: emailMessageStatusEnum('status').notNull(),
    providerMessageId: text('provider_message_id'),
    errorMessage: text('error_message'),
    sentByUserId: uuid('sent_by_user_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('email_messages_enrollment_type_idx').on(
      table.enrollmentId,
      table.emailType,
    ),
    pgPolicy('admins_view_all_email_messages', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('admins_insert_email_messages', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

/**
 * Per-campaign mutex preventing two admins from running the same email
 * campaign concurrently. One row per EmailCampaignType; acquired on preview
 * and released on send completion, dialog close, or campaign switch.
 */
export const emailCampaignLocks = pgTable(
  'email_campaign_locks',
  {
    campaign: text('campaign').primaryKey(),
    lockedByUserId: uuid('locked_by_user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    lockedAt: timestamp('locked_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  () => [
    pgPolicy('admins_manage_email_campaign_locks', {
      for: 'all',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)
