import { randomUUID } from 'node:crypto'
import type { WhatsAppMessageInsert } from '@/utils/repository'
import { insertWhatsAppMessage } from '@/utils/repository'

export async function seedWhatsAppMessage(overrides: {
  enrollmentId: string
  templateName: string
  id?: string
  recipientPhone?: string
  status?: WhatsAppMessageInsert['status']
  providerMessageId?: string | null
  errorMessage?: string | null
  sentByUserId?: string | null
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  await insertWhatsAppMessage({
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
