import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import {
  courseTeachers,
  postCommentReactions,
  postComments,
  postNotifications,
  postReactions,
  posts,
  profiles,
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

// ── Helpers ──────────────────────────────────────────────────────────────

export type PostChannel =
  | { id: 'general'; name: 'General'; courseId: null }
  | { id: string; name: string; courseId: string }

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

export type PostWithDetails = {
  id: string
  course: {
    id: string
    title: string
  } | null
  content: string
  createdAt: Date
  updatedAt: Date
  author: {
    id: string
    fullName: string
    avatarUrl: string | null
  }
  reactions: Array<{
    id: string
    emoji: string
    userId: string
  }>
  commentCount: number
  previewComments: Array<{
    id: string
    content: string
    createdAt: Date
    updatedAt: Date
    author: {
      id: string
      fullName: string
      avatarUrl: string | null
    }
    reactions: Array<{
      id: string
      emoji: string
      userId: string
    }>
  }>
}

export const getPosts = createServerFn({ method: 'POST' })
  .inputValidator(getPostsSchema)
  .handler(async ({ data }) => {
    const db = await getDb()
    const limit = data.limit

    // Build where clause: non-deleted, cursor-based pagination
    const conditions = [isNull(posts.deletedAt)]

    if (data.courseId === null || data.courseId === undefined) {
      conditions.push(isNull(posts.courseId))
    } else {
      conditions.push(eq(posts.courseId, data.courseId))
    }
    if (data.cursor) {
      const cursorDate = new Date(data.cursor.createdAt)
      conditions.push(
        or(
          lt(posts.createdAt, cursorDate),
          and(eq(posts.createdAt, cursorDate), lt(posts.id, data.cursor.id)),
        )!,
      )
    }

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
    let commentCounts: Record<string, number> = {}

    if (postIds.length > 0) {
      const countRows = await db
        .select({
          postId: postComments.postId,
          count: sql<number>`count(*)::int`,
        })
        .from(postComments)
        .where(
          and(
            inArray(postComments.postId, postIds),
            isNull(postComments.deletedAt),
          ),
        )
        .groupBy(postComments.postId)

      commentCounts = Object.fromEntries(
        countRows.map((r) => [r.postId, r.count]),
      )
    }

    const result: Array<PostWithDetails> = postsSlice.map((p) => ({
      id: p.id,
      course: p.course,
      content: p.content,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      author: p.author,
      reactions: p.reactions,
      commentCount: commentCounts[p.id] ?? 0,
      previewComments: p.comments.reverse().map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        author: c.author,
        reactions: c.reactions,
      })),
    }))

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

      if (!full) throw new Error('Post not found')

      const recipients = new Set<string>()
      const courseId = data.courseId ?? null

      if (canModerate) {
        const studentRows = await db
          .select({ id: profiles.id })
          .from(profiles)
          .where(
            sql`${profiles.role} = 'student' AND ${profiles.id} <> ${user.id}`,
          )

        for (const row of studentRows) recipients.add(row.id)

        if (courseId === null) {
          const staffRows = await db
            .select({ id: profiles.id })
            .from(profiles)
            .where(
              sql`${profiles.role} IN ('teacher','admin') AND ${profiles.id} <> ${user.id}`,
            )

          for (const row of staffRows) recipients.add(row.id)
        }
      }

      if (courseId) {
        const teacherRows = await db
          .select({ id: courseTeachers.teacherId })
          .from(courseTeachers)
          .where(eq(courseTeachers.courseId, courseId))

        for (const row of teacherRows) {
          if (row.id !== user.id) recipients.add(row.id)
        }
      }

      if (recipients.size > 0) {
        await db.insert(postNotifications).values(
          Array.from(recipients).map((recipientId) => ({
            userId: recipientId,
            actorId: user.id,
            event: 'post_created' as const,
            postId: post.id,
            commentId: null,
          })),
        )
      }

      return {
        post: {
          id: full.id,
          course: full.course,
          content: full.content,
          createdAt: full.createdAt,
          updatedAt: full.updatedAt,
          author: full.author,
          reactions: full.reactions,
          commentCount: 0,
          previewComments: full.comments.reverse().map((c) => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            author: c.author,
            reactions: c.reactions,
          })),
        } satisfies PostWithDetails,
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

    if (!row) throw new Error('Post not found')

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
      previewComments: row.comments.reverse().map((c) => ({
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

      if (!existing) throw new Error('Post not found')
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

      if (!existing) throw new Error('Post not found')
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

    if (existing) {
      if (existing.emoji === data.emoji) {
        // Same emoji → remove
        await db.delete(postReactions).where(eq(postReactions.id, existing.id))
        return { action: 'removed' as const }
      } else {
        // Different emoji → update
        await db
          .update(postReactions)
          .set({ emoji: data.emoji })
          .where(eq(postReactions.id, existing.id))
        return { action: 'updated' as const }
      }
    } else {
      // No existing → insert
      await db.insert(postReactions).values({
        postId: data.postId,
        userId: user.id,
        emoji: data.emoji,
      })
      return { action: 'added' as const }
    }
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

    if (existing) {
      if (existing.emoji === data.emoji) {
        await db
          .delete(postCommentReactions)
          .where(eq(postCommentReactions.id, existing.id))
        return { action: 'removed' as const }
      }

      await db
        .update(postCommentReactions)
        .set({ emoji: data.emoji })
        .where(eq(postCommentReactions.id, existing.id))
      return { action: 'updated' as const }
    }

    await db.insert(postCommentReactions).values({
      commentId: data.commentId,
      userId: user.id,
      emoji: data.emoji,
    })
    return { action: 'added' as const }
  })

// ── Comments ──────────────────────────────────────────────────────────────

export type CommentWithAuthor = {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
  author: {
    id: string
    fullName: string
    avatarUrl: string | null
  }
  reactions: Array<{
    id: string
    emoji: string
    userId: string
  }>
}

export const getComments = createServerFn({ method: 'POST' })
  .inputValidator(getCommentsSchema)
  .handler(async ({ data }) => {
    const db = await getDb()
    const limit = data.limit

    const conditions = [
      eq(postComments.postId, data.postId),
      isNull(postComments.deletedAt),
    ]

    if (data.cursor) {
      const cursorDate = new Date(data.cursor.createdAt)
      conditions.push(
        or(
          lt(postComments.createdAt, cursorDate),
          and(
            eq(postComments.createdAt, cursorDate),
            lt(postComments.id, data.cursor.id),
          ),
        )!,
      )
    }

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
      .reverse()
      .map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        author: c.author,
        reactions: c.reactions,
      }))

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
    if (!post) throw new Error('Post not found')

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

    if (post.authorId !== user.id) {
      await db.insert(postNotifications).values({
        userId: post.authorId,
        actorId: user.id,
        event: 'comment_created' as const,
        postId: post.id,
        commentId: comment.id,
      })
    }

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

    if (!existing) throw new Error('Comment not found')
    if (existing.authorId !== user.id) throw new Error('Not authorized')

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

      if (!existing) throw new Error('Comment not found')
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
