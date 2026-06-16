import type {
  CommentCreatedEvent,
  DeliveryAdapter,
  PostCreatedEvent,
} from './types'
import { buildNotificationRows } from './domain/notification-rows.domain'
import { getDb } from '@/db'
import { postNotifications } from '@/db/schema'

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

    const db = await getDb()

    try {
      await db.insert(postNotifications).values(rows)
    } catch (error) {
      console.error(
        `Notification delivery failed for event ${event.type} to ${recipientIds.length} recipients:`,
        error,
      )
    }
  }
}
