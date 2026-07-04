import { toWaRecipient } from '../domain/phone.domain'
import { buildTemplatePayload } from '../domain/templates.domain'
import type { WhatsAppSender, WhatsAppTemplateMessage } from '../types'
import { env } from '@/env'

/* v8 ignore start */
/**
 * Meta WhatsApp Cloud API adapter: POSTs a template message to
 * graph.facebook.com from the academy's official number. External IO
 * boundary — integration tests inject a fake via `setWhatsAppSender`.
 */
export class CloudApiWhatsAppSender implements WhatsAppSender {
  async send(
    message: WhatsAppTemplateMessage,
  ): Promise<{ providerMessageId: string }> {
    const response = await fetch(
      `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toWaRecipient(message.toE164),
          type: 'template',
          template: buildTemplatePayload(
            message.templateName,
            message.recipientName,
          ),
        }),
      },
    )

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`WhatsApp Cloud API ${response.status}: ${errorBody}`)
    }

    const data = await response.json()
    const providerMessageId = (data as { messages?: Array<{ id?: string }> })
      .messages?.[0]?.id
    if (!providerMessageId) {
      throw new Error('WhatsApp Cloud API response missing message id')
    }
    return { providerMessageId }
  }
}
/* v8 ignore end */
