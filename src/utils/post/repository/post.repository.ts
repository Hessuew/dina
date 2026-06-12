import { and, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import type {
  PostAuthor,
  PostReaction,
  RawComment,
} from '@/utils/post/domain/post.domain'
import { getDb } from '@/db'
import {
  postCommentReactions,
  postComments,
  postReactions,
  posts,
} from '@/db/schema'

type RawPostRow = {
  id: string
  course: { id: string; title: string } | null
  content: string
  createdAt: Date
  updatedAt: Date
  author: PostAuthor
  reactions: Array<PostReaction>
  comments: Array<RawComment>
}

type RawCommentRow = RawComment

function buildPostWhereConditions(filters: {
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

function buildCommentWhereConditions(
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

/* v8 ignore start */

export async function findChannels() {
  const db = await getDb()
  return db.query.courses.findMany({
    columns: { id: true, title: true, orderIndex: true },
    orderBy: (c, { asc }) => [asc(c.orderIndex), asc(c.title)],
  })
}

export async function findPosts(filters: {
  courseId?: string | null
  cursor?: { createdAt: string; id: string } | null
  limit: number
}): Promise<Array<RawPostRow>> {
  const db = await getDb()
  const conditions = buildPostWhereConditions({
    courseId: filters.courseId,
    cursor: filters.cursor,
  })

  return db.query.posts.findMany({
    where: and(...conditions),
    orderBy: [desc(posts.createdAt), desc(posts.id)],
    limit: filters.limit + 1,
    with: {
      course: { columns: { id: true, title: true } },
      author: { columns: { id: true, fullName: true, avatarUrl: true } },
      reactions: { columns: { id: true, emoji: true, userId: true } },
      comments: {
        where: isNull(postComments.deletedAt),
        orderBy: [desc(postComments.createdAt)],
        limit: 3,
        with: {
          author: { columns: { id: true, fullName: true, avatarUrl: true } },
          reactions: { columns: { id: true, emoji: true, userId: true } },
        },
      },
    },
  }) as Promise<Array<RawPostRow>>
}

export async function findPostById(
  postId: string,
): Promise<RawPostRow | undefined> {
  const db = await getDb()
  return db.query.posts.findFirst({
    where: and(eq(posts.id, postId), isNull(posts.deletedAt)),
    with: {
      course: { columns: { id: true, title: true } },
      author: { columns: { id: true, fullName: true, avatarUrl: true } },
      reactions: { columns: { id: true, emoji: true, userId: true } },
      comments: {
        where: isNull(postComments.deletedAt),
        orderBy: [desc(postComments.createdAt)],
        limit: 3,
        with: {
          author: { columns: { id: true, fullName: true, avatarUrl: true } },
          reactions: { columns: { id: true, emoji: true, userId: true } },
        },
      },
    },
  }) as Promise<RawPostRow | undefined>
}

export async function findPostForWrite(postId: string) {
  const db = await getDb()
  return db.query.posts.findFirst({
    where: and(eq(posts.id, postId), isNull(posts.deletedAt)),
  })
}

export async function insertPost(values: {
  authorId: string
  courseId: string | null
  content: string
}): Promise<{ id: string }> {
  const db = await getDb()
  const row = (await db.insert(posts).values(values).returning()).at(0)
  if (!row) throw new Error('Insert returned no rows for post')
  return row
}

export async function updatePostContent(
  postId: string,
  content: string,
): Promise<{ id: string; content: string; updatedAt: Date }> {
  const db = await getDb()
  const row = (
    await db
      .update(posts)
      .set({ content, updatedAt: new Date() })
      .where(eq(posts.id, postId))
      .returning()
  ).at(0)
  if (!row) throw new Error(`Update returned no rows for post: ${postId}`)
  return row as { id: string; content: string; updatedAt: Date }
}

export async function softDeletePost(
  postId: string,
  deletedBy: string,
): Promise<void> {
  const db = await getDb()
  await db
    .update(posts)
    .set({ deletedAt: new Date(), deletedBy })
    .where(eq(posts.id, postId))
}

export async function calculateCommentCounts(
  postIds: Array<string>,
): Promise<Record<string, number>> {
  if (postIds.length === 0) return {}

  const db = await getDb()
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

  return Object.fromEntries(countRows.map((r) => [r.postId, r.count]))
}

export async function findComments(filters: {
  postId: string
  cursor?: { createdAt: string; id: string } | null
  limit: number
}): Promise<Array<RawCommentRow>> {
  const db = await getDb()
  const conditions = buildCommentWhereConditions(filters.postId, filters.cursor)

  return db.query.postComments.findMany({
    where: and(...conditions),
    orderBy: [desc(postComments.createdAt), desc(postComments.id)],
    limit: filters.limit + 1,
    with: {
      author: { columns: { id: true, fullName: true, avatarUrl: true } },
      reactions: { columns: { id: true, emoji: true, userId: true } },
    },
  }) as Promise<Array<RawCommentRow>>
}

export async function findCommentForWrite(commentId: string) {
  const db = await getDb()
  return db.query.postComments.findFirst({
    where: and(eq(postComments.id, commentId), isNull(postComments.deletedAt)),
  })
}

export async function insertComment(values: {
  postId: string
  authorId: string
  content: string
}): Promise<{ id: string }> {
  const db = await getDb()
  const row = (await db.insert(postComments).values(values).returning()).at(0)
  if (!row) throw new Error('Insert returned no rows for comment')
  return row
}

export async function findCommentWithAuthor(
  commentId: string,
): Promise<RawCommentRow | undefined> {
  const db = await getDb()
  return db.query.postComments.findFirst({
    where: and(eq(postComments.id, commentId), isNull(postComments.deletedAt)),
    with: {
      author: { columns: { id: true, fullName: true, avatarUrl: true } },
      reactions: { columns: { id: true, emoji: true, userId: true } },
    },
  }) as Promise<RawCommentRow | undefined>
}

export async function updateCommentContent(
  commentId: string,
  content: string,
): Promise<{ id: string; content: string; updatedAt: Date }> {
  const db = await getDb()
  const row = (
    await db
      .update(postComments)
      .set({ content, updatedAt: new Date() })
      .where(eq(postComments.id, commentId))
      .returning()
  ).at(0)
  if (!row) throw new Error(`Update returned no rows for comment: ${commentId}`)
  return row as { id: string; content: string; updatedAt: Date }
}

export async function softDeleteComment(
  commentId: string,
  deletedBy: string,
): Promise<void> {
  const db = await getDb()
  await db
    .update(postComments)
    .set({ deletedAt: new Date(), deletedBy })
    .where(eq(postComments.id, commentId))
}

export async function findPostReaction(postId: string, userId: string) {
  const db = await getDb()
  return db.query.postReactions.findFirst({
    where: and(
      eq(postReactions.postId, postId),
      eq(postReactions.userId, userId),
    ),
  })
}

export async function insertPostReaction(values: {
  postId: string
  userId: string
  emoji: string
}): Promise<void> {
  const db = await getDb()
  await db.insert(postReactions).values(values)
}

export async function updatePostReaction(
  id: string,
  emoji: string,
): Promise<void> {
  const db = await getDb()
  await db.update(postReactions).set({ emoji }).where(eq(postReactions.id, id))
}

export async function deletePostReaction(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(postReactions).where(eq(postReactions.id, id))
}

export async function findCommentReaction(commentId: string, userId: string) {
  const db = await getDb()
  return db.query.postCommentReactions.findFirst({
    where: and(
      eq(postCommentReactions.commentId, commentId),
      eq(postCommentReactions.userId, userId),
    ),
  })
}

export async function insertCommentReaction(values: {
  commentId: string
  userId: string
  emoji: string
}): Promise<void> {
  const db = await getDb()
  await db.insert(postCommentReactions).values(values)
}

export async function updateCommentReaction(
  id: string,
  emoji: string,
): Promise<void> {
  const db = await getDb()
  await db
    .update(postCommentReactions)
    .set({ emoji })
    .where(eq(postCommentReactions.id, id))
}

export async function deleteCommentReaction(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(postCommentReactions).where(eq(postCommentReactions.id, id))
}

/* v8 ignore end */
