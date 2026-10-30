import { toWaRecipient } from '../domain/phone.domain'
import { buildTemplatePayload } from '../domain/templates.domain'
import type { WhatsAppSender, WhatsAppTemplateMessage } from '../types'
import { env } from '@/env'

/**
 * Meta WhatsApp Cloud API adapter: POSTs a template message to
 * graph.facebook.com from the academy's official number. External IO
 * boundary — integration tests inject a fake via `setWhatsAppSender`.
 *
 * `WHATSAPP_ENABLED=false` (pre-production until genuine Meta credentials
 * exist) fails the send before any network request; the token and phone
 * number id are optional at boot but required here when sending is enabled.
 */
export class CloudApiWhatsAppSender implements WhatsAppSender {
  async send(
    message: WhatsAppTemplateMessage,
  ): Promise<{ providerMessageId: string }> {
    if (!env.WHATSAPP_ENABLED) {
      throw new Error('WhatsApp sending is disabled (WHATSAPP_ENABLED=false)')
    }
    const accessToken = env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID
    if (!accessToken || !phoneNumberId) {
      throw new Error(
        'WhatsApp is enabled but WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured',
      )
    }
    const response = await fetch(
      `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
