import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
// alias); post/comment authorization resolves ownership and staff roles from
// seeded profiles. See docs/TESTING_GUIDE.md / ADR 0009.

describe('getPostChannelsService (integration)', () => {
  it('requires a persisted profile before reading channels', async () => {
    await expect(getPostChannelsService(randomUUID())).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('returns the general channel plus a channel per course', async () => {
    const courseId = await seedCourse({ title: 'Maths' })
    const viewerId = await seedProfile()

    const { channels } = await getPostChannelsService(viewerId)

    expect(channels[0]).toEqual({
      id: 'general',
      name: 'General',
      courseId: null,
    })
    expect(channels.some((c) => c.courseId === courseId)).toBe(true)
  })
})

describe('getPostsService (integration)', () => {
  it('requires a persisted profile before reading posts', async () => {
    await expect(
      getPostsService({ courseId: null, limit: 10 }, randomUUID()),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('paginates and returns a cursor when more posts exist', async () => {
    const authorId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    await seedPost({ authorId, courseId })
    await seedPost({ authorId, courseId })
    await seedPost({ authorId, courseId })

    const { posts, nextCursor } = await getPostsService(
      { courseId, limit: 2 },
      authorId,
    )

    expect(posts).toHaveLength(2)
    expect(nextCursor).toBeDefined()
  })

  it('includes the comment count for each post', async () => {
    const authorId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    const postId = await seedPost({ authorId, courseId })
    await seedComment({ postId, authorId })
    await seedComment({ postId, authorId })

    const { posts } = await getPostsService({ courseId, limit: 10 }, authorId)

    const post = posts.find((p) => p.id === postId)
    expect(post?.commentCount).toBe(2)
  })
})

describe('getPostByIdService (integration)', () => {
  it('requires a persisted profile before reading a post', async () => {
    await expect(
      getPostByIdService({ postId: randomUUID() }, randomUUID()),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('returns the post', async () => {
    const authorId = await seedProfile({ role: 'teacher' })
    const postId = await seedPost({ authorId })

    const { post } = await getPostByIdService({ postId }, authorId)

    expect(post.id).toBe(postId)
  })

  it('throws when the post does not exist', async () => {
    await expect(
      getPostByIdService({ postId: randomUUID() }, await seedProfile()),
    ).rejects.toMatchObject({ code: 'POST_NOT_FOUND', status: 404 })
  })
})

describe('createPostBaseService (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  it('emits redacted post and comment mutation events', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const authorId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse()
    const postResult = await createPostBaseService(
      { courseId, content: 'Private post body' },
      authorId,
    )
    const postId = postResult.post.id

    await updatePostService(
      { postId, content: 'Updated private post body' },
      authorId,
    )

    const commentResult = await createCommentBaseService(
      { postId, content: 'Private comment body' },
      authorId,
    )
    const commentId = commentResult.comment.id
    await updateCommentService(
      { commentId, content: 'Updated private comment body' },
      authorId,
    )
    await deleteCommentService({ commentId }, authorId)
    await deletePostService({ postId }, authorId)

    const lines = infoSpy.mock.calls.map(([line]) => String(line))
    const events = lines.map((line) => JSON.parse(line))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'post_created',
          path: 'serverFn:createPost',
          actorId: authorId,
          postId,
          courseId,
          status: 'success',
        }),
        expect.objectContaining({
          event: 'post_updated',
          path: 'serverFn:updatePost',
          actorId: authorId,
          postId,
          status: 'success',
        }),
        expect.objectContaining({
          event: 'post_deleted',
          path: 'serverFn:deletePost',
          actorId: authorId,
          postId,
          status: 'success',
        }),
        expect.objectContaining({
          event: 'comment_created',
          path: 'serverFn:createComment',
          actorId: authorId,
          postId,
          commentId,
          status: 'success',
        }),
        expect.objectContaining({
          event: 'comment_updated',
          path: 'serverFn:updateComment',
          actorId: authorId,
          postId,
          commentId,
          status: 'success',
        }),
        expect.objectContaining({
          event: 'comment_deleted',
          path: 'serverFn:deleteComment',
          actorId: authorId,
          postId,
          commentId,
          status: 'success',
        }),
      ]),
    )
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
    expect(lines.join('\n')).not.toContain('Private post body')
    expect(lines.join('\n')).not.toContain('Updated private post body')
    expect(lines.join('\n')).not.toContain('Private comment body')
    expect(lines.join('\n')).not.toContain('Updated private comment body')
  })
})

describe('updatePostService (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  it('rejects a non-author student editor', async () => {
    const authorId = await seedProfile({ role: 'student' })
    const otherStudentId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId, content: 'old' })

    await expect(
      updatePostService({ postId, content: 'tampered' }, otherStudentId),
    ).rejects.toMatchObject({ code: 'ACTION_NOT_ALLOWED', status: 403 })
  })

  it('does not log an expected missing-post failure', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const authorId = await seedProfile({ role: 'student' })

    await expect(
      updatePostService({ postId: randomUUID(), content: 'x' }, authorId),
    ).rejects.toMatchObject({ code: 'POST_NOT_FOUND', status: 404 })

    expect(infoSpy).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

describe('deletePostService (integration)', () => {
  it('soft-deletes the author’s post so it can no longer be fetched', async () => {
    const authorId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId })

    const result = await deletePostService({ postId }, authorId)

    expect(result).toEqual({ success: true })
    await expect(
      getPostByIdService({ postId }, authorId),
    ).rejects.toMatchObject({
      code: 'POST_NOT_FOUND',
    })
  })

  it('throws when the post does not exist', async () => {
    const authorId = await seedProfile({ role: 'student' })

    await expect(
      deletePostService({ postId: randomUUID() }, authorId),
    ).rejects.toMatchObject({ code: 'POST_NOT_FOUND', status: 404 })
  })

  it('rejects a non-author student deleter', async () => {
    const authorId = await seedProfile({ role: 'student' })
    const otherStudentId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId })

    await expect(
      deletePostService({ postId }, otherStudentId),
    ).rejects.toMatchObject({ code: 'ACTION_NOT_ALLOWED', status: 403 })
  })

  it('allows a teacher to moderate another user’s post', async () => {
    const authorId = await seedProfile({ role: 'student' })
    const teacherId = await seedProfile({ role: 'teacher' })
    const postId = await seedPost({ authorId })

    await expect(deletePostService({ postId }, teacherId)).resolves.toEqual({
      success: true,
    })
  })
})

describe('getCommentsService (integration)', () => {
  it('requires a persisted profile before reading comments', async () => {
    await expect(
      getCommentsService({ postId: randomUUID(), limit: 10 }, randomUUID()),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('paginates comments and returns a cursor when more exist', async () => {
    const authorId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId })
    await seedComment({ postId, authorId })
    await seedComment({ postId, authorId })
    await seedComment({ postId, authorId })

    const { comments, nextCursor } = await getCommentsService(
      {
        postId,
        limit: 2,
      },
      authorId,
    )

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

  it('rejects a non-author student deleter', async () => {
    const authorId = await seedProfile({ role: 'student' })
    const otherStudentId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId })
    const commentId = await seedComment({ postId, authorId })

    await expect(
      deleteCommentService({ commentId }, otherStudentId),
    ).rejects.toMatchObject({ code: 'ACTION_NOT_ALLOWED', status: 403 })
  })

  it('allows a teacher to moderate another user’s comment', async () => {
    const authorId = await seedProfile({ role: 'student' })
    const teacherId = await seedProfile({ role: 'teacher' })
    const postId = await seedPost({ authorId })
    const commentId = await seedComment({ postId, authorId })

    await expect(
      deleteCommentService({ commentId }, teacherId),
    ).resolves.toEqual({ success: true })
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

describe('reaction telemetry (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs redacted success events for post and comment toggles', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const userId = await seedProfile({ role: 'student' })
    const postId = await seedPost({ authorId: userId })
    const commentId = await seedComment({ postId, authorId: userId })

    await togglePostReactionService({ postId, emoji: '👍' }, userId)
    await toggleCommentReactionService({ commentId, emoji: '🎉' }, userId)

    const lines = infoSpy.mock.calls.map(([line]) => String(line))
    const events = lines.map((line) => JSON.parse(line))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'post_reaction_toggled',
          path: 'serverFn:toggleReaction',
          actorId: userId,
          postId,
          reactionAction: 'added',
          emoji: '👍',
          status: 'success',
        }),
        expect.objectContaining({
          event: 'comment_reaction_toggled',
          path: 'serverFn:toggleCommentReaction',
          actorId: userId,
          commentId,
          reactionAction: 'added',
          emoji: '🎉',
          status: 'success',
        }),
      ]),
    )
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
  })

  it('logs stable failure categories without raw persistence details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const userId = await seedProfile({ role: 'student' })
    const missingPostId = randomUUID()
    const missingCommentId = randomUUID()

    await expect(
      togglePostReactionService({ postId: missingPostId, emoji: '👍' }, userId),
    ).rejects.toBeDefined()
    await expect(
      toggleCommentReactionService(
        { commentId: missingCommentId, emoji: '🎉' },
        userId,
      ),
    ).rejects.toBeDefined()

    const lines = errorSpy.mock.calls.map(([line]) => String(line))
    const events = lines.map((line) => JSON.parse(line))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'post_mutation_failed',
          path: 'serverFn:toggleReaction',
          postId: missingPostId,
          errorCategory: 'post_reaction_persistence',
          status: 'failure',
        }),
        expect.objectContaining({
          event: 'post_mutation_failed',
          path: 'serverFn:toggleCommentReaction',
          commentId: missingCommentId,
          errorCategory: 'comment_reaction_persistence',
          status: 'failure',
        }),
      ]),
    )
    expect(lines.join('\n')).not.toContain('foreign key')
  })
})
