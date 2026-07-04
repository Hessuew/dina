/* v8 ignore start */
import { and, asc, eq, gt, isNull, lt, ne, or } from 'drizzle-orm'
import type { CampaignRecipient } from '../domain/bulk-send.domain'
import type { CampaignCohort, CampaignType } from '../domain/templates.domain'
import { getDb } from '@/db'
import {
  enrollments,
  invitations,
  whatsappCampaignLocks,
  whatsappMessages,
} from '@/db/schema'

/**
 * WHERE predicate per campaign cohort — same shape as `emailGroupWhere` in
 * enrolment.repository.ts (see CONTEXT.md → Email Export Cohorts).
 */
function campaignCohortWhere(cohort: CampaignCohort) {
  switch (cohort) {
    case 'approved':
      return eq(enrollments.status, 'approved')
    case 'not_registered':
      return and(
        eq(enrollments.invitationSent, true),
        or(isNull(invitations.status), ne(invitations.status, 'accepted')),
      )
  }
}

/**
 * Returns the campaign cohort's recipients (id + phone + names). LEFT joins
 * invitations so the not_registered cohort can filter on invitation status.
 */
export async function findEnrollmentRecipientsByCampaign(
  cohort: CampaignCohort,
): Promise<Array<CampaignRecipient>> {
  const db = await getDb()
  return db
    .select({
      enrollmentId: enrollments.id,
      phoneWhatsApp: enrollments.phoneWhatsApp,
      preferredName: enrollments.preferredName,
      fullLegalName: enrollments.fullLegalName,
    })
    .from(enrollments)
    .leftJoin(invitations, eq(enrollments.invitationId, invitations.id))
    .where(campaignCohortWhere(cohort))
    .orderBy(asc(enrollments.createdAt))
}

/**
 * Enrollment ids that already received the template successfully — the
 * dedupe source for `planBulkSend`. Failed attempts are retried, so only
 * `status='sent'` rows count.
 */
export async function findSentEnrollmentIdsByTemplate(
  templateName: string,
): Promise<Set<string>> {
  const db = await getDb()
  const rows = await db
    .select({ enrollmentId: whatsappMessages.enrollmentId })
    .from(whatsappMessages)
    .where(
      and(
        eq(whatsappMessages.templateName, templateName),
        eq(whatsappMessages.status, 'sent'),
      ),
    )
  return new Set(rows.map((r) => r.enrollmentId))
}

export type WhatsAppMessageInsert = typeof whatsappMessages.$inferInsert

export async function insertWhatsAppMessage(
  row: WhatsAppMessageInsert,
): Promise<void> {
  const db = await getDb()
  await db.insert(whatsappMessages).values(row)
}

const LOCK_TTL_MS = 5 * 60 * 1000

/**
 * Atomically acquires the per-campaign lock for userId.
 * Returns true if acquired (inserted or renewed), false if held by another admin.
 * Uses INSERT … ON CONFLICT DO UPDATE WHERE (expired OR same user) RETURNING —
 * empty RETURNING means the conflict row was left untouched (held by someone else).
 */
export async function acquireWhatsAppCampaignLock(
  campaign: CampaignType,
  userId: string,
): Promise<boolean> {
  const db = await getDb()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS)
  const rows = await db
    .insert(whatsappCampaignLocks)
    .values({ campaign, lockedByUserId: userId, lockedAt: now, expiresAt })
    .onConflictDoUpdate({
      target: whatsappCampaignLocks.campaign,
      set: { lockedByUserId: userId, lockedAt: now, expiresAt },
      // Compare against a JS Date param, not SQL NOW(): the column is
      // timestamp-without-timezone storing drizzle-serialized UTC wall time,
      // while NOW() renders in the session timezone.
      where: or(
        lt(whatsappCampaignLocks.expiresAt, now),
        eq(whatsappCampaignLocks.lockedByUserId, userId),
      ),
    })
    .returning({ lockedByUserId: whatsappCampaignLocks.lockedByUserId })
  return rows.length > 0
}

export async function releaseWhatsAppCampaignLock(
  campaign: CampaignType,
  userId: string,
): Promise<void> {
  const db = await getDb()
  await db
    .delete(whatsappCampaignLocks)
    .where(
      and(
        eq(whatsappCampaignLocks.campaign, campaign),
        eq(whatsappCampaignLocks.lockedByUserId, userId),
      ),
    )
}

export async function checkWhatsAppCampaignLockHeldBy(
  campaign: CampaignType,
  userId: string,
): Promise<boolean> {
  const db = await getDb()
  const rows = await db
    .select({ campaign: whatsappCampaignLocks.campaign })
    .from(whatsappCampaignLocks)
    .where(
      and(
        eq(whatsappCampaignLocks.campaign, campaign),
        eq(whatsappCampaignLocks.lockedByUserId, userId),
        gt(whatsappCampaignLocks.expiresAt, new Date()),
      ),
    )
  return rows.length > 0
}

export async function getLockedCampaigns(): Promise<Array<CampaignType>> {
  const db = await getDb()
  const rows = await db
    .select({ campaign: whatsappCampaignLocks.campaign })
    .from(whatsappCampaignLocks)
    .where(gt(whatsappCampaignLocks.expiresAt, new Date()))
  return rows.map((r) => r.campaign as CampaignType)
}
/* v8 ignore end */
