import { and, eq, gt, lt, or } from 'drizzle-orm'
import type { EmailCampaignType } from '@/utils/email/domain/campaigns.domain'
import { getDb } from '@/db'
import { emailCampaignLocks } from '@/db/schema'

const LOCK_TTL_MS = 5 * 60 * 1000

export async function findEmailCampaignLock(campaign: EmailCampaignType) {
  const db = await getDb()
  return db.query.emailCampaignLocks.findFirst({
    where: eq(emailCampaignLocks.campaign, campaign),
  })
}

/* v8 ignore start */
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
