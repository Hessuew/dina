import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import type {
  CommentWithAuthor,
  PostChannel,
  PostWithDetails,
} from '@/domain/post.service'
import { getDb } from '@/db'
import {
  postCommentReactions,
  postComments,
  postReactions,
  posts,
} from '@/db/schema'
import {
  createCommentSchema,
  createPostSchema,
  deleteCommentSchema,
  deletePostSchema,
  getCommentsSchema,
  getPostByIdSchema,
  getPostsSchema,
  toggleCommentReactionSchema,
  toggleReactionSchema,
  updateCommentSchema,
  updatePostSchema,
} from '@/schemas/post.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { authz, withRequestCache } from '@/utils/authz'
import { AuthorizationError, NotFoundError } from '@/utils/errors'
import {
  createCommentCreatedEvent,
  createPostCreatedEvent,
} from '@/utils/notifications/events'
import { emit } from '@/utils/notifications'
import {
  calculateCommentCounts,
  determineReactionAction,
  transformCommentWithAuthor,
  transformPostWithDetails,
} from '@/domain/post.service'

// ── Helpers ──────────────────────────────────────────────────────────────

function buildPostWhereClause(filters: {
  courseId?: string | null
  cursor?: { createdAt: string; id: string } | null
}) {
  const conditions = [isNull(posts.deletedAt)]

  if (filters.courseId === null || filters.courseId === undefined) {
    conditions.push(isNull(posts.courseId))
  } else {
    conditions.push(eq(posts.courseId, filters.courseId))
  }

  if (filters.cursor) {
    const cursorDate = new Date(filters.cursor.createdAt)
    const cursorCondition = or(
      lt(posts.createdAt, cursorDate),
      and(eq(posts.createdAt, cursorDate), lt(posts.id, filters.cursor.id)),
    )
    if (cursorCondition) {
      conditions.push(cursorCondition)
    }
  }

  return conditions
}

function buildCommentWhereClause(
  postId: string,
  cursor?: { createdAt: string; id: string } | null,
) {
  const conditions = [
    eq(postComments.postId, postId),
    isNull(postComments.deletedAt),
  ]

  if (cursor) {
    const cursorDate = new Date(cursor.createdAt)
    const cursorCondition = or(
      lt(postComments.createdAt, cursorDate),
      and(
        eq(postComments.createdAt, cursorDate),
        lt(postComments.id, cursor.id),
      ),
    )
    if (cursorCondition) {
      conditions.push(cursorCondition)
    }
  }

  return conditions
}

export const getPostChannels = createServerFn({ method: 'POST' }).handler(
  async () => {
    await getCurrentUser()
    const db = await getDb()

    const rows = await db.query.courses.findMany({
      columns: { id: true, title: true, orderIndex: true },
      orderBy: (c, { asc }) => [asc(c.orderIndex), asc(c.title)],
    })

    const channels: Array<PostChannel> = [
      { id: 'general', name: 'General', courseId: null },
      ...rows.map((c) => ({
        id: c.id,
        name: c.title,
        courseId: c.id,
      })),
    ]

    return { channels }
  },
)

// ── Posts ─────────────────────────────────────────────────────────────────

export const getPosts = createServerFn({ method: 'POST' })
  .inputValidator(getPostsSchema)
  .handler(async ({ data }) => {
    const db = await getDb()
    const limit = data.limit

    const conditions = buildPostWhereClause({
      courseId: data.courseId,
      cursor: data.cursor,
    })

    const rows = await db.query.posts.findMany({
      where: and(...conditions),
      orderBy: [desc(posts.createdAt), desc(posts.id)],
      limit: limit + 1,
      with: {
        course: {
          columns: { id: true, title: true },
        },
        author: {
          columns: { id: true, fullName: true, avatarUrl: true },
        },
        reactions: {
          columns: { id: true, emoji: true, userId: true },
        },
        comments: {
          where: isNull(postComments.deletedAt),
          orderBy: [desc(postComments.createdAt)],
          limit: 3,
          with: {
            author: {
              columns: { id: true, fullName: true, avatarUrl: true },
            },
            reactions: {
              columns: { id: true, emoji: true, userId: true },
            },
          },
        },
      },
    })

    const hasMore = rows.length > limit
    const postsSlice = hasMore ? rows.slice(0, limit) : rows

    // We need total non-deleted comment counts per post
    const postIds = postsSlice.map((p) => p.id)
    const commentCounts = await calculateCommentCounts(db, postIds)

    const result: Array<PostWithDetails> = postsSlice.map((p) =>
      transformPostWithDetails(p, commentCounts[p.id] ?? 0),
    )

    const lastPost = postsSlice[postsSlice.length - 1]
    const nextCursor = hasMore
      ? { createdAt: lastPost.createdAt.toISOString(), id: lastPost.id }
      : undefined

    return { posts: result, nextCursor }
  })

export const createPost = createServerFn({ method: 'POST' })
  .inputValidator(createPostSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      const isTeacher = await authz(user.id).isRole('teacher')
      const isAdmin = await authz(user.id).isAdmin()
      const canModerate = isTeacher || isAdmin

      const [post] = await db
        .insert(posts)
        .values({
          authorId: user.id,
          courseId: data.courseId ?? null,
          content: data.content,
        })
        .returning()

      const full = await db.query.posts.findFirst({
        where: and(eq(posts.id, post.id), isNull(posts.deletedAt)),
        with: {
          course: {
            columns: { id: true, title: true },
          },
          author: {
            columns: { id: true, fullName: true, avatarUrl: true },
          },
          reactions: {
            columns: { id: true, emoji: true, userId: true },
          },
          comments: {
            where: isNull(postComments.deletedAt),
            orderBy: [desc(postComments.createdAt)],
            limit: 3,
            with: {
              author: {
                columns: { id: true, fullName: true, avatarUrl: true },
              },
              reactions: {
                columns: { id: true, emoji: true, userId: true },
              },
            },
          },
        },
      })

      if (!full) {
        throw new NotFoundError('Post not found', {
          code: 'POST_NOT_FOUND',
          details: { postId: post.id },
        })
      }

      const event = createPostCreatedEvent(
        user.id,
        post.id,
        data.courseId ?? null,
        canModerate,
      )
      await emit(event)

      return {
        post: transformPostWithDetails(full, 0),
      }
    })
  })

export const getPostById = createServerFn({ method: 'POST' })
  .inputValidator(getPostByIdSchema)
  .handler(async ({ data }) => {
    await getCurrentUser()
    const db = await getDb()

    const row = await db.query.posts.findFirst({
      where: and(eq(posts.id, data.postId), isNull(posts.deletedAt)),
      with: {
        course: {
          columns: { id: true, title: true },
        },
        author: {
          columns: { id: true, fullName: true, avatarUrl: true },
        },
        reactions: {
          columns: { id: true, emoji: true, userId: true },
        },
        comments: {
          where: isNull(postComments.deletedAt),
          orderBy: [desc(postComments.createdAt)],
          limit: 3,
          with: {
            author: {
              columns: { id: true, fullName: true, avatarUrl: true },
            },
            reactions: {
              columns: { id: true, emoji: true, userId: true },
            },
          },
        },
      },
    })

    if (!row) {
      throw new NotFoundError('Post not found', {
        code: 'POST_NOT_FOUND',
        details: { postId: data.postId },
      })
    }

    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(postComments)
      .where(
        and(eq(postComments.postId, row.id), isNull(postComments.deletedAt)),
      )

    const commentCount = countRows[0]?.count ?? 0

    const result: PostWithDetails = {
      id: row.id,
      course: row.course,
      content: row.content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: row.author,
      reactions: row.reactions,
      commentCount,
      previewComments: row.comments
        .slice()
        .reverse()
        .map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          author: c.author,
          reactions: c.reactions,
        })),
    }

    return { post: result }
  })

export const updatePost = createServerFn({ method: 'POST' })
  .inputValidator(updatePostSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      const existing = await db.query.posts.findFirst({
        where: and(eq(posts.id, data.postId), isNull(posts.deletedAt)),
      })

      if (!existing) {
        throw new NotFoundError('Post not found', {
          code: 'POST_NOT_FOUND',
          details: { postId: data.postId },
        })
      }
      if (existing.authorId !== user.id) {
        await authz(user.id).perform('editPost').on('post', data.postId)
      }

      const [post] = await db
        .update(posts)
        .set({ content: data.content, updatedAt: new Date() })
        .where(eq(posts.id, data.postId))
        .returning()

      return { post }
    })
  })

export const deletePost = createServerFn({ method: 'POST' })
  .inputValidator(deletePostSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      const existing = await db.query.posts.findFirst({
        where: and(eq(posts.id, data.postId), isNull(posts.deletedAt)),
      })

      if (!existing) {
        throw new NotFoundError('Post not found', {
          code: 'POST_NOT_FOUND',
          details: { postId: data.postId },
        })
      }
      if (existing.authorId !== user.id) {
        await authz(user.id).perform('deletePost').on('post', data.postId)
      }

      await db
        .update(posts)
        .set({ deletedAt: new Date(), deletedBy: user.id })
        .where(eq(posts.id, data.postId))

      return { success: true }
    })
  })

// ── Reactions ─────────────────────────────────────────────────────────────

export const toggleReaction = createServerFn({ method: 'POST' })
  .inputValidator(toggleReactionSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const existing = await db.query.postReactions.findFirst({
      where: and(
        eq(postReactions.postId, data.postId),
        eq(postReactions.userId, user.id),
      ),
    })

    const action = determineReactionAction(existing, data.emoji)

    switch (action) {
      case 'added':
        await db.insert(postReactions).values({
          postId: data.postId,
          userId: user.id,
          emoji: data.emoji,
        })
        break
      case 'removed':
        if (existing) {
          await db
            .delete(postReactions)
            .where(eq(postReactions.id, existing.id))
        }
        break
      case 'updated':
        if (existing) {
          await db
            .update(postReactions)
            .set({ emoji: data.emoji })
            .where(eq(postReactions.id, existing.id))
        }
        break
    }

    return { action }
  })

export const toggleCommentReaction = createServerFn({ method: 'POST' })
  .inputValidator(toggleCommentReactionSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const existing = await db.query.postCommentReactions.findFirst({
      where: and(
        eq(postCommentReactions.commentId, data.commentId),
        eq(postCommentReactions.userId, user.id),
      ),
    })

    const action = determineReactionAction(existing, data.emoji)

    switch (action) {
      case 'added':
        await db.insert(postCommentReactions).values({
          commentId: data.commentId,
          userId: user.id,
          emoji: data.emoji,
        })
        break
      case 'removed':
        if (existing) {
          await db
            .delete(postCommentReactions)
            .where(eq(postCommentReactions.id, existing.id))
        }
        break
      case 'updated':
        if (existing) {
          await db
            .update(postCommentReactions)
            .set({ emoji: data.emoji })
            .where(eq(postCommentReactions.id, existing.id))
        }
        break
    }

    return { action }
  })

// ── Comments ──────────────────────────────────────────────────────────────

export const getComments = createServerFn({ method: 'POST' })
  .inputValidator(getCommentsSchema)
  .handler(async ({ data }) => {
    const db = await getDb()
    const limit = data.limit

    const conditions = buildCommentWhereClause(data.postId, data.cursor)

    const rows = await db.query.postComments.findMany({
      where: and(...conditions),
      orderBy: [desc(postComments.createdAt), desc(postComments.id)],
      limit: limit + 1,
      with: {
        author: {
          columns: { id: true, fullName: true, avatarUrl: true },
        },
        reactions: {
          columns: { id: true, emoji: true, userId: true },
        },
      },
    })

    const hasMore = rows.length > limit
    const commentsSlice = hasMore ? rows.slice(0, limit) : rows

    const result: Array<CommentWithAuthor> = commentsSlice
      .slice()
      .reverse()
      .map((c) => transformCommentWithAuthor(c))

    const lastRow = commentsSlice[commentsSlice.length - 1]
    const nextCursor = hasMore
      ? { createdAt: lastRow.createdAt.toISOString(), id: lastRow.id }
      : undefined

    return { comments: result, nextCursor }
  })

export const createComment = createServerFn({ method: 'POST' })
  .inputValidator(createCommentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const post = await db.query.posts.findFirst({
      where: and(eq(posts.id, data.postId), isNull(posts.deletedAt)),
    })
    if (!post) {
      throw new NotFoundError('Post not found', {
        code: 'POST_NOT_FOUND',
        details: { postId: data.postId },
      })
    }

    const [comment] = await db
      .insert(postComments)
      .values({
        postId: data.postId,
        authorId: user.id,
        content: data.content,
      })
      .returning()

    // Fetch with author for immediate display
    const full = await db.query.postComments.findFirst({
      where: eq(postComments.id, comment.id),
      with: {
        author: {
          columns: { id: true, fullName: true, avatarUrl: true },
        },
        reactions: {
          columns: { id: true, emoji: true, userId: true },
        },
      },
    })

    const event = createCommentCreatedEvent(
      user.id,
      post.id,
      comment.id,
      post.authorId,
    )
    await emit(event)

    return { comment: full! }
  })

export const updateComment = createServerFn({ method: 'POST' })
  .inputValidator(updateCommentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const existing = await db.query.postComments.findFirst({
      where: and(
        eq(postComments.id, data.commentId),
        isNull(postComments.deletedAt),
      ),
    })

    if (!existing) {
      throw new NotFoundError('Comment not found', {
        code: 'COMMENT_NOT_FOUND',
        details: { commentId: data.commentId },
      })
    }
    if (existing.authorId !== user.id) {
      throw new AuthorizationError('Not authorized', {
        internalMessage: `User ${user.id} attempted to edit comment ${data.commentId} owned by ${existing.authorId}`,
        details: { commentId: data.commentId, authorId: existing.authorId },
      })
    }

    const [comment] = await db
      .update(postComments)
      .set({ content: data.content, updatedAt: new Date() })
      .where(eq(postComments.id, data.commentId))
      .returning()

    return { comment }
  })

export const deleteComment = createServerFn({ method: 'POST' })
  .inputValidator(deleteCommentSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      const existing = await db.query.postComments.findFirst({
        where: and(
          eq(postComments.id, data.commentId),
          isNull(postComments.deletedAt),
        ),
      })

      if (!existing) {
        throw new NotFoundError('Comment not found', {
          code: 'COMMENT_NOT_FOUND',
          details: { commentId: data.commentId },
        })
      }
      if (existing.authorId !== user.id) {
        await authz(user.id)
          .perform('deleteComment')
          .on('comment', data.commentId)
      }

      await db
        .update(postComments)
        .set({ deletedAt: new Date(), deletedBy: user.id })
        .where(eq(postComments.id, data.commentId))

      return { success: true }
    })
  })
