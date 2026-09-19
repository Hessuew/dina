import { and, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { whatsappMessages } from '@/db/schema'

export type WhatsAppMessageInsert = typeof whatsappMessages.$inferInsert

export async function findWhatsAppMessagesByEnrollmentId(enrollmentId: string) {
  const db = await getDb()
  return db
    .select()
    .from(whatsappMessages)
    .where(eq(whatsappMessages.enrollmentId, enrollmentId))
}

/* v8 ignore start */
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
  return new Set(rows.map((row) => row.enrollmentId))
}

export async function insertWhatsAppMessage(
  row: WhatsAppMessageInsert,
): Promise<void> {
  const db = await getDb()
  await db.insert(whatsappMessages).values(row)
}
/* v8 ignore end */
