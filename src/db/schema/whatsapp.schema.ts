import { index, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { whatsappMessageStatusEnum } from './enums.schema'
import { enrollments } from './enrollment.schema'
import { profiles } from './profile.schema'

/**
 * Outbound WhatsApp message log. One row per send attempt (sent or failed).
 * Serves as the audit trail, the dedupe source for campaign re-runs
 * (enrollmentId + templateName), and the anchor for future delivery webhooks.
 */
export const whatsappMessages = pgTable(
  'whatsapp_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    recipientPhone: text('recipient_phone').notNull(),
    templateName: text('template_name').notNull(),
    status: whatsappMessageStatusEnum('status').notNull(),
    providerMessageId: text('provider_message_id'),
    errorMessage: text('error_message'),
    // Nullable so the audit row survives if the sending admin's profile is deleted.
    sentByUserId: uuid('sent_by_user_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // Dedupe lookup: has this enrollment already received this template?
    index('whatsapp_messages_enrollment_template_idx').on(
      table.enrollmentId,
      table.templateName,
    ),
    pgPolicy('admins_view_all_whatsapp_messages', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
    pgPolicy('admins_insert_whatsapp_messages', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)

/**
 * Per-campaign mutex preventing two admins from running the same WhatsApp
 * campaign concurrently. One row per CampaignType; acquired on campaign
 * selection (preview), released on send completion / dialog close / campaign
 * switch. `expiresAt` (5-min TTL) is the fallback if the browser closes
 * without releasing. See ADR 0015.
 */
export const whatsappCampaignLocks = pgTable(
  'whatsapp_campaign_locks',
  {
    campaign: text('campaign').primaryKey(),
    lockedByUserId: uuid('locked_by_user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    lockedAt: timestamp('locked_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  () => [
    pgPolicy('admins_manage_campaign_locks', {
      for: 'all',
      to: authenticatedRole,
      using: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
      withCheck: sql`(SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'`,
    }),
  ],
)
