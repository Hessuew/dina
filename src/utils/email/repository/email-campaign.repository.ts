/* v8 ignore start */
import { and, asc, eq, gt, isNull, lt, ne, or } from 'drizzle-orm'
import type {
  EmailCampaignCohort,
  EmailCampaignType,
} from '../domain/campaigns.domain'
import type { InvitationCampaignRecipient } from '../domain/bulk-invite.domain'
import { getDb } from '@/db'
import { emailCampaignLocks, enrollments, invitations } from '@/db/schema'

function campaignCohortWhere(cohort: EmailCampaignCohort) {
  cohort satisfies EmailCampaignCohort
  return and(
    eq(enrollments.status, 'approved'),
    or(isNull(invitations.status), ne(invitations.status, 'accepted')),
  )
}

export async function findEmailCampaignRecipients(
  cohort: EmailCampaignCohort,
): Promise<Array<InvitationCampaignRecipient>> {
  const db = await getDb()
  const rows = await db
    .select({
      enrollmentId: enrollments.id,
      email: enrollments.email,
      invitationId: invitations.id,
      invitationStatus: invitations.status,
      invitationExpiresAt: invitations.expiresAt,
      invitationToken: invitations.token,
    })
    .from(enrollments)
    .leftJoin(invitations, eq(invitations.email, enrollments.email))
    .where(campaignCohortWhere(cohort))
    .orderBy(asc(enrollments.createdAt))

  return rows.map((row) => ({
    enrollmentId: row.enrollmentId,
    email: row.email,
    invitation: row.invitationId
      ? {
          id: row.invitationId,
          status: row.invitationStatus!,
          expiresAt: row.invitationExpiresAt!,
          token: row.invitationToken!,
        }
      : null,
  }))
}

const LOCK_TTL_MS = 5 * 60 * 1000

export async function acquireEmailCampaignLock(
  campaign: EmailCampaignType,
  userId: string,
): Promise<boolean> {
  const db = await getDb()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS)
  const rows = await db
    .insert(emailCampaignLocks)
    .values({ campaign, lockedByUserId: userId, lockedAt: now, expiresAt })
    .onConflictDoUpdate({
      target: emailCampaignLocks.campaign,
      set: { lockedByUserId: userId, lockedAt: now, expiresAt },
      where: or(
        lt(emailCampaignLocks.expiresAt, now),
        eq(emailCampaignLocks.lockedByUserId, userId),
      ),
    })
    .returning({ lockedByUserId: emailCampaignLocks.lockedByUserId })
  return rows.length > 0
}

export async function releaseEmailCampaignLock(
  campaign: EmailCampaignType,
  userId: string,
): Promise<void> {
  const db = await getDb()
  await db
    .delete(emailCampaignLocks)
    .where(
      and(
        eq(emailCampaignLocks.campaign, campaign),
        eq(emailCampaignLocks.lockedByUserId, userId),
      ),
    )
}

export async function checkEmailCampaignLockHeldBy(
  campaign: EmailCampaignType,
  userId: string,
): Promise<boolean> {
  const db = await getDb()
  const rows = await db
    .select({ campaign: emailCampaignLocks.campaign })
    .from(emailCampaignLocks)
    .where(
      and(
        eq(emailCampaignLocks.campaign, campaign),
        eq(emailCampaignLocks.lockedByUserId, userId),
        gt(emailCampaignLocks.expiresAt, new Date()),
      ),
    )
  return rows.length > 0
}

export async function getLockedEmailCampaigns(): Promise<
  Array<EmailCampaignType>
> {
  const db = await getDb()
  const rows = await db
    .select({ campaign: emailCampaignLocks.campaign })
    .from(emailCampaignLocks)
    .where(gt(emailCampaignLocks.expiresAt, new Date()))
  return rows.map((row) => row.campaign as EmailCampaignType)
}
/* v8 ignore end */
