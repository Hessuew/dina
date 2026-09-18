import { and, eq, gt, lt, or } from 'drizzle-orm'
import type { CampaignType } from '@/utils/whatsapp/domain/templates.domain'
import { getDb } from '@/db'
import { whatsappCampaignLocks } from '@/db/schema'

const LOCK_TTL_MS = 5 * 60 * 1000

/* v8 ignore start */
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

export async function getLockedWhatsAppCampaigns(): Promise<
  Array<CampaignType>
> {
  const db = await getDb()
  const rows = await db
    .select({ campaign: whatsappCampaignLocks.campaign })
    .from(whatsappCampaignLocks)
    .where(gt(whatsappCampaignLocks.expiresAt, new Date()))
  return rows.map((row) => row.campaign as CampaignType)
}
/* v8 ignore end */
