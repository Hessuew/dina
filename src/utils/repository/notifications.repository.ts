import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { notifications } from '@/db/schema'

export type NotificationRow = typeof notifications.$inferSelect
export type NotificationInsert = typeof notifications.$inferInsert

/* v8 ignore start */
// fallow-ignore-next-line unused-export -- public table seam retained for the legacy schema
export async function findNotificationById(
  notificationId: string,
): Promise<NotificationRow | undefined> {
  const db = await getDb()
  return db.query.notifications.findFirst({
    where: eq(notifications.id, notificationId),
  })
}

// fallow-ignore-next-line unused-export -- public table seam retained for the legacy schema
export async function findNotificationsByUserId(
  userId: string,
): Promise<Array<NotificationRow>> {
  const db = await getDb()
  return db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: [desc(notifications.createdAt)],
  })
}

// fallow-ignore-next-line unused-export -- public table seam retained for the legacy schema
export async function insertNotification(
  values: NotificationInsert,
): Promise<NotificationRow | undefined> {
  const db = await getDb()
  return (await db.insert(notifications).values(values).returning()).at(0)
}

// fallow-ignore-next-line unused-export -- public table seam retained for the legacy schema
export async function updateNotification(
  notificationId: string,
  values: Partial<NotificationInsert>,
): Promise<NotificationRow | undefined> {
  const db = await getDb()
  return (
    await db
      .update(notifications)
      .set(values)
      .where(eq(notifications.id, notificationId))
      .returning()
  ).at(0)
}

// fallow-ignore-next-line unused-export -- public table seam retained for the legacy schema
export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  const db = await getDb()
  await db.delete(notifications).where(eq(notifications.id, notificationId))
}
/* v8 ignore end */
