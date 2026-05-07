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
    event: NotificationEvent,
    recipientIds: Array<string>,
  ): Promise<void> {
    if (recipientIds.length === 0) {
      return
    }

    const db = await getDb()

    try {
      switch (event.type) {
        case 'post_created': {
          const postEvent = event as PostCreatedEvent
          await db.insert(postNotifications).values(
            recipientIds.map((recipientId) => ({
              userId: recipientId,
              actorId: event.actorId,
              event: 'post_created' as const,
              postId: postEvent.postId,
              commentId: null,
            })),
          )
          break
        }
        case 'comment_created': {
          const commentEvent = event as CommentCreatedEvent
          await db.insert(postNotifications).values(
            recipientIds.map((recipientId) => ({
              userId: recipientId,
              actorId: event.actorId,
              event: 'comment_created' as const,
              postId: commentEvent.postId,
              commentId: commentEvent.commentId,
            })),
          )
          break
        }
        default:
          console.error('Unknown notification event type:', event.type)
      }
    } catch (error) {
      console.error(
        `Notification delivery failed for event ${event.type} to ${recipientIds.length} recipients:`,
        error,
      )
    }
  }
}
