import { buildNotificationRows } from './domain/notification-rows.domain'
import type {
  CommentCreatedEvent,
  DeliveryAdapter,
  PostCreatedEvent,
} from './types'
import { getDb } from '@/db'
import { postNotifications } from '@/db/schema'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'

export class DatabaseDeliveryAdapter implements DeliveryAdapter {
  async deliver(
    event: PostCreatedEvent | CommentCreatedEvent,
    recipientIds: Array<string>,
  ): Promise<void> {
    if (recipientIds.length === 0) {
      return
    }

    const rows = buildNotificationRows(event, recipientIds)
    if (rows.length === 0) {
      return
    }

    const startedAt = performance.now()

    try {
      const db = await getDb()
      await db.insert(postNotifications).values(rows)
    } catch {
      logServerEvent('error', 'notification_delivery_failed', {
        requestId: getRequestId(),
        path: 'notifications:deliver',
        status: 'failure',
        durationMs: elapsedMs(startedAt),
        notificationType: event.type,
        recipientCount: rows.length,
        errorCategory: 'notification_delivery',
      })
    }
  }
}
