import { postNotifications } from '@/db/schema'
import type { CommentCreatedEvent, PostCreatedEvent } from '../types'

/** A row ready to be inserted into `postNotifications`. */
export type NotificationInsertRow = typeof postNotifications.$inferInsert

/**
 * Builds the `postNotifications` insert rows for a delivery event, one per
 * recipient. `post_created` rows carry a null `commentId`; `comment_created`
 * rows carry the event's `commentId`. Returns an empty array for an unknown
 * event type (the caller then inserts nothing).
 */
export function buildNotificationRows(
  event: PostCreatedEvent | CommentCreatedEvent,
  recipientIds: Array<string>,
): Array<NotificationInsertRow> {
  switch (event.type) {
    case 'post_created':
      return recipientIds.map((recipientId) => ({
        userId: recipientId,
        actorId: event.actorId,
        event: 'post_created' as const,
        postId: event.postId,
        commentId: null,
      }))
    case 'comment_created':
      return recipientIds.map((recipientId) => ({
        userId: recipientId,
        actorId: event.actorId,
        event: 'comment_created' as const,
        postId: event.postId,
        commentId: event.commentId,
      }))
    default:
      return []
  }
}
