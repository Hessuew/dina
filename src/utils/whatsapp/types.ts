import type { WhatsAppTemplateName } from './domain/templates.domain'

export type WhatsAppTemplateMessage = {
  toE164: string
  templateName: WhatsAppTemplateName
  recipientName: string
}

/**
 * Port for sending one template message. Implementations throw on provider
 * error; the caller records the outcome in the `whatsapp_messages` log.
 * Swap via `setWhatsAppSender` (tests, future provider change).
 */
export interface WhatsAppSender {
  send(message: WhatsAppTemplateMessage): Promise<{ providerMessageId: string }>
}
