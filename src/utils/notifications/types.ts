export type NotificationEventType = 'post_created' | 'comment_created'

export interface NotificationEvent {
  type: NotificationEventType
  actorId: string
  timestamp: Date
}

export interface PostCreatedEvent extends NotificationEvent {
  type: 'post_created'
  postId: string
  courseId: string | null
  canModerate: boolean
}

export interface CommentCreatedEvent extends NotificationEvent {
  type: 'comment_created'
  postId: string
  commentId: string
  postAuthorId: string
}

export interface RecipientResult {
  recipientIds: Array<string>
}

export interface DeliveryAdapter {
  deliver: (
    event: PostCreatedEvent | CommentCreatedEvent,
    recipientIds: Array<string>,
  ) => Promise<void>
}
