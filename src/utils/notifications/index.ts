import { DatabaseDeliveryAdapter } from './delivery'
import { getRecipients } from './recipients'
import type { DeliveryAdapter, NotificationEvent } from './types'

let deliveryAdapter: DeliveryAdapter = new DatabaseDeliveryAdapter()

export async function emit(event: NotificationEvent): Promise<void> {
  const { recipientIds } = await getRecipients(event)

  if (recipientIds.length === 0) {
    return
  }

  await deliveryAdapter.deliver(event, recipientIds)
}

export function registerDeliveryAdapter(adapter: DeliveryAdapter): void {
  deliveryAdapter = adapter
}

export function resetDeliveryAdapter(): void {
  deliveryAdapter = new DatabaseDeliveryAdapter()
}

export { getRecipients }
