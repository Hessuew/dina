import { getDb } from '@/db'
import { emailMessages } from '@/db/schema'

export type EmailMessageInsert = typeof emailMessages.$inferInsert

/* v8 ignore start */
export async function insertEmailMessage(
  row: EmailMessageInsert,
): Promise<void> {
  const db = await getDb()
  await db.insert(emailMessages).values(row)
}
/* v8 ignore end */
