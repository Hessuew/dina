import type {
  CreateCommentInput,
  CreatePostInput,
  DeleteCommentInput,
  DeletePostInput,
  GetCommentsInput,
  GetPostByIdInput,
  GetPostsInput,
  ToggleCommentReactionInput,
  ToggleReactionInput,
  UpdateCommentInput,
  UpdatePostInput,
} from '@/schemas/post.schema'
import type {
  CommentWithAuthor,
  PostChannel,
  PostWithDetails,
  ReactionAction,
} from '@/utils/post/domain/post.domain'
import {
  determineReactionAction,
  transformCommentWithAuthor,
  transformPostWithDetails,
} from '@/utils/post/domain/post.domain'
import {
  calculateCommentCounts,
  deleteCommentReaction,
  deletePostReaction,
  findChannels,
  findCommentForWrite,
  findCommentReaction,
  findCommentWithAuthor,
  findComments,
  findPostById,
  findPostForWrite,
  findPostReaction,
  findPosts,
  insertComment,
  insertCommentReaction,
  insertPost,
  insertPostReaction,
  softDeleteComment,
  softDeletePost,
  updateCommentContent,
  updateCommentReaction,
  updatePostContent,
  updatePostReaction,
} from '@/utils/post/repository/post.repository'
import { AuthorizationError, NotFoundError } from '@/utils/errors'
import { authz } from '@/utils/authz'

export async function getPostChannelsService(): Promise<{
  channels: Array<PostChannel>
}> {
  const rows = await findChannels()
  const channels: Array<PostChannel> = [
    { id: 'general', name: 'General', courseId: null },
    ...rows.map((c) => ({
      id: c.id,
      name: c.title,
      courseId: c.id,
    })),
  ]
  return { channels }
}

export async function getPostsService(data: GetPostsInput): Promise<{
  posts: Array<PostWithDetails>
  nextCursor?: { createdAt: string; id: string }
}> {
  const limit = data.limit
  const rows = await findPosts({
    courseId: data.courseId,
    cursor: data.cursor,
    limit,
  })

  const hasMore = rows.length > limit
  const postsSlice = hasMore ? rows.slice(0, limit) : rows
  const postIds = postsSlice.map((p) => p.id)
  const commentCounts = await calculateCommentCounts(postIds)

  const result = postsSlice.map((p) =>
    transformPostWithDetails(p, commentCounts[p.id] ?? 0),
  )

  const lastPost = postsSlice[postsSlice.length - 1]
  const nextCursor = hasMore
    ? { createdAt: lastPost.createdAt.toISOString(), id: lastPost.id }
    : undefined

  return { posts: result, nextCursor }
}

export async function getPostByIdService(data: GetPostByIdInput): Promise<{
  post: PostWithDetails
}> {
  const row = await findPostById(data.postId)

  if (!row) {
    throw new NotFoundError('Post not found', {
      code: 'POST_NOT_FOUND',
      details: { postId: data.postId },
    })
  }

  const commentCounts = await calculateCommentCounts([row.id])
  return {
    post: transformPostWithDetails(row, commentCounts[row.id] ?? 0),
  }
}

export async function createPostBaseService(
  data: CreatePostInput,
  userId: string,
): Promise<{ post: PostWithDetails; canModerate: boolean }> {
  const [isTeacher, isAdmin] = await Promise.all([
    authz(userId).isRole('teacher'),
    authz(userId).isAdmin(),
  ])
  const canModerate = isTeacher || isAdmin

  const inserted = await insertPost({
    authorId: userId,
    courseId: data.courseId ?? null,
    content: data.content,
  })

  const full = await findPostById(inserted.id)
  if (!full) {
    throw new NotFoundError('Post not found after insert', {
      code: 'POST_NOT_FOUND',
      details: { postId: inserted.id },
    })
  }

  return { post: transformPostWithDetails(full, 0), canModerate }
}

export async function updatePostService(
  data: UpdatePostInput,
  userId: string,
): Promise<{ post: { id: string; content: string; updatedAt: Date } }> {
  const existing = await findPostForWrite(data.postId)

  if (!existing) {
    throw new NotFoundError('Post not found', {
      code: 'POST_NOT_FOUND',
      details: { postId: data.postId },
    })
  }
  if (existing.authorId !== userId) {
    await authz(userId).perform('editPost').on('post', data.postId)
  }

  const post = await updatePostContent(data.postId, data.content)
  return { post }
}

export async function deletePostService(
  data: DeletePostInput,
  userId: string,
): Promise<{ success: true }> {
  const existing = await findPostForWrite(data.postId)

  if (!existing) {
    throw new NotFoundError('Post not found', {
      code: 'POST_NOT_FOUND',
      details: { postId: data.postId },
    })
  }
  if (existing.authorId !== userId) {
    await authz(userId).perform('deletePost').on('post', data.postId)
  }

  await softDeletePost(data.postId, userId)
  return { success: true }
}

export async function getCommentsService(data: GetCommentsInput): Promise<{
  comments: Array<CommentWithAuthor>
  nextCursor?: { createdAt: string; id: string }
}> {
  const limit = data.limit
  const rows = await findComments({
    postId: data.postId,
    cursor: data.cursor,
    limit,
  })

  const hasMore = rows.length > limit
  const commentsSlice = hasMore ? rows.slice(0, limit) : rows

  const result = commentsSlice
    .slice()
    .reverse()
    .map((c) => transformCommentWithAuthor(c))

  const lastRow = commentsSlice[commentsSlice.length - 1]
  const nextCursor = hasMore
    ? { createdAt: lastRow.createdAt.toISOString(), id: lastRow.id }
    : undefined

  return { comments: result, nextCursor }
}

export async function createCommentBaseService(
  data: CreateCommentInput,
  userId: string,
): Promise<{ comment: CommentWithAuthor; postAuthorId: string }> {
  const post = await findPostForWrite(data.postId)
  if (!post) {
    throw new NotFoundError('Post not found', {
      code: 'POST_NOT_FOUND',
      details: { postId: data.postId },
    })
  }

  const inserted = await insertComment({
    postId: data.postId,
    authorId: userId,
    content: data.content,
  })

  const full = await findCommentWithAuthor(inserted.id)
  if (!full) {
    throw new NotFoundError('Comment not found after insert', {
      code: 'COMMENT_NOT_FOUND',
      details: { commentId: inserted.id },
    })
  }

  return {
    comment: transformCommentWithAuthor(full),
    postAuthorId: post.authorId,
  }
}

export async function updateCommentService(
  data: UpdateCommentInput,
  userId: string,
): Promise<{ comment: { id: string; content: string; updatedAt: Date } }> {
  const existing = await findCommentForWrite(data.commentId)

  if (!existing) {
    throw new NotFoundError('Comment not found', {
      code: 'COMMENT_NOT_FOUND',
      details: { commentId: data.commentId },
    })
  }
  if (existing.authorId !== userId) {
    throw new AuthorizationError('Not authorized', {
      internalMessage: `User ${userId} attempted to edit comment ${data.commentId} owned by ${existing.authorId}`,
      details: { commentId: data.commentId, authorId: existing.authorId },
    })
  }

  const comment = await updateCommentContent(data.commentId, data.content)
  return { comment }
}

export async function deleteCommentService(
  data: DeleteCommentInput,
  userId: string,
): Promise<{ success: true }> {
  const existing = await findCommentForWrite(data.commentId)

  if (!existing) {
    throw new NotFoundError('Comment not found', {
      code: 'COMMENT_NOT_FOUND',
      details: { commentId: data.commentId },
    })
  }
  if (existing.authorId !== userId) {
    await authz(userId).perform('deleteComment').on('comment', data.commentId)
  }

  await softDeleteComment(data.commentId, userId)
  return { success: true }
}

export async function togglePostReactionService(
  data: ToggleReactionInput,
  userId: string,
): Promise<{ action: ReactionAction }> {
  const existing = await findPostReaction(data.postId, userId)
  const action = determineReactionAction(existing, data.emoji)

  switch (action) {
    case 'added':
      await insertPostReaction({
        postId: data.postId,
        userId,
        emoji: data.emoji,
      })
      break
    case 'removed':
      if (existing) await deletePostReaction(existing.id)
      break
    case 'updated':
      if (existing) await updatePostReaction(existing.id, data.emoji)
      break
  }

  return { action }
}

export async function toggleCommentReactionService(
  data: ToggleCommentReactionInput,
  userId: string,
): Promise<{ action: ReactionAction }> {
  const existing = await findCommentReaction(data.commentId, userId)
  const action = determineReactionAction(existing, data.emoji)

  switch (action) {
    case 'added':
      await insertCommentReaction({
        commentId: data.commentId,
        userId,
        emoji: data.emoji,
      })
      break
    case 'removed':
      if (existing) await deleteCommentReaction(existing.id)
      break
    case 'updated':
      if (existing) await updateCommentReaction(existing.id, data.emoji)
      break
  }

  return { action }
}
