import { DatabaseDeliveryAdapter } from './delivery'
import { getRecipients } from './recipients'
import type {
  CommentCreatedEvent,
  DeliveryAdapter,
  PostCreatedEvent,
} from './types'

const deliveryAdapter: DeliveryAdapter = new DatabaseDeliveryAdapter()

export async function emit(
  event: PostCreatedEvent | CommentCreatedEvent,
): Promise<void> {
  const { recipientIds } = await getRecipients(event)

  if (recipientIds.length === 0) {
    return
  }

  await deliveryAdapter.deliver(event, recipientIds)
}

