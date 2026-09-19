import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { announcements } from '@/db/schema'

export type AnnouncementRow = typeof announcements.$inferSelect
export type AnnouncementInsert = typeof announcements.$inferInsert

/* v8 ignore start */
export async function findAnnouncementById(
  announcementId: string,
): Promise<AnnouncementRow | undefined> {
  const db = await getDb()
  return db.query.announcements.findFirst({
    where: eq(announcements.id, announcementId),
  })
}

export async function findAnnouncements(): Promise<Array<AnnouncementRow>> {
  const db = await getDb()
  return db.query.announcements.findMany({
    orderBy: [desc(announcements.createdAt)],
  })
}

export async function insertAnnouncement(
  values: AnnouncementInsert,
): Promise<AnnouncementRow | undefined> {
  const db = await getDb()
  return (await db.insert(announcements).values(values).returning()).at(0)
}

export async function updateAnnouncement(
  announcementId: string,
  values: Partial<AnnouncementInsert>,
): Promise<AnnouncementRow | undefined> {
  const db = await getDb()
  return (
    await db
      .update(announcements)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(announcements.id, announcementId))
      .returning()
  ).at(0)
}

export async function deleteAnnouncement(
  announcementId: string,
): Promise<void> {
  const db = await getDb()
  await db.delete(announcements).where(eq(announcements.id, announcementId))
}
/* v8 ignore end */
