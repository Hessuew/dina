import { DatabaseDeliveryAdapter } from './delivery'
import { getRecipients } from './recipients'
import type {
  CommentCreatedEvent,
  DeliveryAdapter,
  PostCreatedEvent,
} from './types'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'

const deliveryAdapter: DeliveryAdapter = new DatabaseDeliveryAdapter()

export async function emit(
  event: PostCreatedEvent | CommentCreatedEvent,
): Promise<void> {
  const startedAt = performance.now()
  let recipientIds: Array<string>

  try {
    const result = await getRecipients(event)
    recipientIds = result.recipientIds
  } catch {
    logServerEvent('error', 'notification_recipient_resolution_failed', {
      requestId: getRequestId(),
      path: 'notifications:resolve_recipients',
      status: 'failure',
      durationMs: elapsedMs(startedAt),
      notificationType: event.type,
      actorId: event.actorId,
      postId: event.postId,
      errorCategory: 'notification_recipient_read_persistence',
    })
    return
  }

  logServerEvent('info', 'notification_recipients_resolved', {
    requestId: getRequestId(),
    path: 'notifications:resolve_recipients',
    status: 'success',
    durationMs: elapsedMs(startedAt),
    notificationType: event.type,
    actorId: event.actorId,
    postId: event.postId,
    recipientCount: recipientIds.length,
  })

  if (recipientIds.length === 0) {
    return
  }

  await deliveryAdapter.deliver(event, recipientIds)
}
