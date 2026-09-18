import { and, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import type { RawComment } from '@/utils/post/domain/post.domain'
import { getDb } from '@/db'
import { postComments } from '@/db/schema'

type RawCommentRow = RawComment

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
    if (cursorCondition) conditions.push(cursorCondition)
  }

  return conditions
}

/* v8 ignore start */

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

  return Object.fromEntries(countRows.map((row) => [row.postId, row.count]))
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

/* v8 ignore end */
