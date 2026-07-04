import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import { whatsappMessages } from '@/db/schema'

export async function seedWhatsAppMessage(overrides: {
  enrollmentId: string
  templateName: string
  id?: string
  recipientPhone?: string
  status?: 'sent' | 'failed'
  providerMessageId?: string | null
  errorMessage?: string | null
  sentByUserId?: string | null
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(whatsappMessages).values({
    id,
    enrollmentId: overrides.enrollmentId,
    templateName: overrides.templateName,
    recipientPhone: overrides.recipientPhone ?? '+358401234567',
    status: overrides.status ?? 'sent',
    providerMessageId: overrides.providerMessageId ?? 'wamid.test',
    errorMessage: overrides.errorMessage ?? null,
    sentByUserId: overrides.sentByUserId ?? null,
  })
  return id
}
