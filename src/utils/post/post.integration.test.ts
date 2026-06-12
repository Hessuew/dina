import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  createCommentBaseService,
  createPostBaseService,
  deleteCommentService,
  deletePostService,
  getCommentsService,
  getPostByIdService,
  getPostChannelsService,
  getPostsService,
  toggleCommentReactionService,
  togglePostReactionService,
  updateCommentService,
  updatePostService,
} from '@/utils/post/service/post.service'
import {
  seedComment,
  seedCommentReaction,
  seedCourse,
  seedPost,
  seedPostReaction,
  seedProfile,
} from '@/../test/integration/seed'

// Post services have no external IO. The DB is real (PGlite via the `@/db`
// alias); post/comment authz is currently permissive (see default-adapter
// canAccessPost/canAccessComment TODOs), so role checks resolve from seeded
// profiles. See docs/TESTING_GUIDE.md / ADR 0009.

describe('getPostChannelsService (integration)', () => {
  it('returns the general channel plus a channel per course', async () => {
    const courseId = await seedCourse({ title: 'Maths' })

    const { channels } = await getPostChannelsService()

    expect(channels[0]).toEqual({
      id: 'general',
      name: 'General',
      courseId: null,
    })
    expect(channels.some((c) => c.courseId === courseId)).toBe(true)
  })
})

describe('getPostsService (integration)', () => {
  it('paginates and returns a cursor when more posts exist', async () => {
    const authorId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    await seedPost({ authorId, courseId })
    await seedPost({ authorId, courseId })
    await seedPost({ authorId, courseId })

    const { posts, nextCursor } = await getPostsService({ courseId, limit: 2 })

    expect(posts).toHaveLength(2)
    expect(nextCursor).toBeDefined()
  })

  it('includes the comment count for each post', async () => {
    const authorId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    const postId = await seedPost({ authorId, courseId })
    await seedComment({ postId, authorId })
    await seedComment({ postId, authorId })

    const { posts } = await getPostsService({ courseId, limit: 10 })

    const post = posts.find((p) => p.id === postId)
    expect(post?.commentCount).toBe(2)
  })
})

describe('getPostByIdService (integration)', () => {
  it('returns the post', async () => {
    const authorId = await seedProfile({ role: 'teacher' })
    const postId = await seedPost({ authorId })

    const { post } = await getPostByIdService({ postId })

    expect(post.id).toBe(postId)
  })

  it('throws when the post does not exist', async () => {
    await expect(
      getPostByIdService({ postId: randomUUID() }),
    ).rejects.toMatchObject({ code: 'POST_NOT_FOUND', status: 404 })
  })
})

describe('createPostBaseService (integration)', () => {
  it('grants moderation to a teacher', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })

    const { post, canModerate } = await createPostBaseService(
      { content: 'Hello' },
      teacherId,
    )

    expect(post.content).toBe('Hello')
    expect(canModerate).toBe(true)
  })

  it('denies moderation to a student', async () => {
    const studentId = await seedProfile({ role: 'student' })

    const { canModerate } = await createPostBaseService(
      { content: 'Hi' },
      studentId,
    )

    expect(canModerate).toBe(false)
  })
})

describe('updatePostService (integration)', () => {
  it('lets the author edit their post', async () => {
    const authorId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId, content: 'old' })

    const { post } = await updatePostService(
      { postId, content: 'new' },
      authorId,
    )

    expect(post.content).toBe('new')
  })

  it('throws when the post does not exist', async () => {
    const authorId = await seedProfile({ role: 'student' })

    await expect(
      updatePostService({ postId: randomUUID(), content: 'x' }, authorId),
    ).rejects.toMatchObject({ code: 'POST_NOT_FOUND', status: 404 })
  })
})

describe('deletePostService (integration)', () => {
  it('soft-deletes the author’s post so it can no longer be fetched', async () => {
    const authorId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId })

    const result = await deletePostService({ postId }, authorId)

    expect(result).toEqual({ success: true })
    await expect(getPostByIdService({ postId })).rejects.toMatchObject({
      code: 'POST_NOT_FOUND',
    })
  })

  it('throws when the post does not exist', async () => {
    const authorId = await seedProfile({ role: 'student' })

    await expect(
      deletePostService({ postId: randomUUID() }, authorId),
    ).rejects.toMatchObject({ code: 'POST_NOT_FOUND', status: 404 })
  })
})

describe('getCommentsService (integration)', () => {
  it('paginates comments and returns a cursor when more exist', async () => {
    const authorId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId })
    await seedComment({ postId, authorId })
    await seedComment({ postId, authorId })
    await seedComment({ postId, authorId })

    const { comments, nextCursor } = await getCommentsService({
      postId,
      limit: 2,
    })

    expect(comments).toHaveLength(2)
    expect(nextCursor).toBeDefined()
  })
})

describe('createCommentBaseService (integration)', () => {
  it('returns the new comment and the post author id', async () => {
    const postAuthorId = await seedProfile({ role: 'student' })
    const commenterId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId: postAuthorId })

    const { comment, postAuthorId: returnedAuthorId } =
      await createCommentBaseService({ postId, content: 'nice' }, commenterId)

    expect(comment.content).toBe('nice')
    expect(returnedAuthorId).toBe(postAuthorId)
  })

  it('throws when the post does not exist', async () => {
    const commenterId = await seedProfile({ role: 'student' })

    await expect(
      createCommentBaseService(
        { postId: randomUUID(), content: 'x' },
        commenterId,
      ),
    ).rejects.toMatchObject({ code: 'POST_NOT_FOUND', status: 404 })
  })
})

describe('updateCommentService (integration)', () => {
  it('lets the author edit their comment', async () => {
    const authorId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId })
    const commentId = await seedComment({ postId, authorId, content: 'old' })

    const { comment } = await updateCommentService(
      { commentId, content: 'new' },
      authorId,
    )

    expect(comment.content).toBe('new')
  })

  it('rejects a non-author editor', async () => {
    const authorId = await seedProfile({ role: 'student' })
    const otherId = await seedProfile({ role: 'teacher' })
    const postId = await seedPost({ authorId })
    const commentId = await seedComment({ postId, authorId })

    await expect(
      updateCommentService({ commentId, content: 'x' }, otherId),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED', status: 403 })
  })

  it('throws when the comment does not exist', async () => {
    const authorId = await seedProfile({ role: 'student' })

    await expect(
      updateCommentService({ commentId: randomUUID(), content: 'x' }, authorId),
    ).rejects.toMatchObject({ code: 'COMMENT_NOT_FOUND', status: 404 })
  })
})

describe('deleteCommentService (integration)', () => {
  it('lets the author soft-delete their comment', async () => {
    const authorId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId })
    const commentId = await seedComment({ postId, authorId })

    const result = await deleteCommentService({ commentId }, authorId)

    expect(result).toEqual({ success: true })
  })

  it('throws when the comment does not exist', async () => {
    const authorId = await seedProfile({ role: 'student' })

    await expect(
      deleteCommentService({ commentId: randomUUID() }, authorId),
    ).rejects.toMatchObject({ code: 'COMMENT_NOT_FOUND', status: 404 })
  })
})

describe('togglePostReactionService (integration)', () => {
  it('adds a reaction when none exists', async () => {
    const userId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId: userId })

    const { action } = await togglePostReactionService(
      { postId, emoji: '👍' },
      userId,
    )

    expect(action).toBe('added')
  })

  it('removes the reaction when toggling the same emoji', async () => {
    const userId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId: userId })
    await seedPostReaction({ postId, userId, emoji: '👍' })

    const { action } = await togglePostReactionService(
      { postId, emoji: '👍' },
      userId,
    )

    expect(action).toBe('removed')
  })

  it('updates the reaction when toggling a different emoji', async () => {
    const userId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId: userId })
    await seedPostReaction({ postId, userId, emoji: '👍' })

    const { action } = await togglePostReactionService(
      { postId, emoji: '❤️' },
      userId,
    )

    expect(action).toBe('updated')
  })
})

describe('toggleCommentReactionService (integration)', () => {
  it('adds then removes a comment reaction across toggles', async () => {
    const userId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId: userId })
    const commentId = await seedComment({ postId, authorId: userId })

    const added = await toggleCommentReactionService(
      { commentId, emoji: '👍' },
      userId,
    )
    expect(added.action).toBe('added')

    const removed = await toggleCommentReactionService(
      { commentId, emoji: '👍' },
      userId,
    )
    expect(removed.action).toBe('removed')
  })

  it('updates the comment reaction when toggling a different emoji', async () => {
    const userId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId: userId })
    const commentId = await seedComment({ postId, authorId: userId })
    await seedCommentReaction({ commentId, userId, emoji: '👍' })

    const { action } = await toggleCommentReactionService(
      { commentId, emoji: '🎉' },
      userId,
    )

    expect(action).toBe('updated')
  })
})
