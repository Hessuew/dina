import type {
  CommentCreatedEvent,
  DeliveryAdapter,
  NotificationEvent,
  PostCreatedEvent,
} from './types'
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

    const db = await getDb()

    try {
      switch (event.type) {
        case 'post_created': {
          await db.insert(postNotifications).values(
            recipientIds.map((recipientId) => ({
              userId: recipientId,
              actorId: event.actorId,
              event: 'post_created' as const,
              postId: event.postId,
              commentId: null,
            })),
          )
          break
        }
        case 'comment_created': {
          await db.insert(postNotifications).values(
            recipientIds.map((recipientId) => ({
              userId: recipientId,
              actorId: event.actorId,
              event: 'comment_created' as const,
              postId: event.postId,
              commentId: event.commentId,
            })),
          )
          break
        }
        default: {
          const _exhaustive: never = event
          console.error(
            'Unknown notification event type:',
            (_exhaustive as NotificationEvent).type,
          )
        }
      }
    } catch (error) {
      console.error(
        `Notification delivery failed for event ${event.type} to ${recipientIds.length} recipients:`,
        error,
      )
    }
  }
}
