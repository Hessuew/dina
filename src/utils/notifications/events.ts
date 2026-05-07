import type { CommentCreatedEvent, PostCreatedEvent } from './types'

export function createPostCreatedEvent(
  actorId: string,
  postId: string,
  courseId: string | null,
  canModerate: boolean,
): PostCreatedEvent {
  return {
    type: 'post_created',
    actorId,
    postId,
    courseId,
    canModerate,
    timestamp: new Date(),
  }
}

export function createCommentCreatedEvent(
  actorId: string,
  postId: string,
  commentId: string,
  postAuthorId: string,
): CommentCreatedEvent {
  return {
    type: 'comment_created',
    actorId,
    postId,
    commentId,
    postAuthorId,
    timestamp: new Date(),
  }
}
