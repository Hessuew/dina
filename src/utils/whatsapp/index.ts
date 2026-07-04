import { CloudApiWhatsAppSender } from './sender/cloud-api-sender'
import type { WhatsAppSender } from './types'

// Composition root (same getter/setter seam as src/utils/authz/service.ts):
// production resolves the Cloud API adapter lazily; tests inject a fake.
let senderInstance: WhatsAppSender | null = null

export function getWhatsAppSender(): WhatsAppSender {
  if (!senderInstance) {
    senderInstance = new CloudApiWhatsAppSender()
  }
  return senderInstance
}

export function setWhatsAppSender(sender: WhatsAppSender): void {
  senderInstance = sender
}
