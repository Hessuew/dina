import type { CreateCommentInput, CreatePostInput } from '@/schemas/post.schema'
import type {
  CommentWithAuthor,
  PostWithDetails,
} from '@/utils/post/domain/post.domain'
import {
  createCommentBaseService,
  createPostBaseService,
} from '@/utils/post/service/post.service'
import {
  createCommentCreatedEvent,
  createPostCreatedEvent,
} from '@/utils/notifications/events'
import { emit } from '@/utils/notifications'

export async function createPostWithNotification(
  data: CreatePostInput,
  userId: string,
): Promise<{ post: PostWithDetails }> {
  const { post, canModerate } = await createPostBaseService(data, userId)

  const event = createPostCreatedEvent(
    userId,
    post.id,
    data.courseId ?? null,
    canModerate,
  )
  await emit(event)

  return { post }
}

export async function createCommentWithNotification(
  data: CreateCommentInput,
  userId: string,
): Promise<{ comment: CommentWithAuthor }> {
  const { comment, postAuthorId } = await createCommentBaseService(
    data,
    userId,
  )

  const event = createCommentCreatedEvent(
    userId,
    data.postId,
    comment.id,
    postAuthorId,
  )
  await emit(event)

  return { comment }
}
