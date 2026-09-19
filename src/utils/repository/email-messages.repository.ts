import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { emailMessages } from '@/db/schema'

export type EmailMessageInsert = typeof emailMessages.$inferInsert

export async function findEmailMessagesByEnrollmentId(enrollmentId: string) {
  const db = await getDb()
  return db
    .select()
    .from(emailMessages)
    .where(eq(emailMessages.enrollmentId, enrollmentId))
}

/* v8 ignore start */
export async function insertEmailMessage(
  row: EmailMessageInsert,
): Promise<void> {
  const db = await getDb()
  await db.insert(emailMessages).values(row)
}
/* v8 ignore end */
