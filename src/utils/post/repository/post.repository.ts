import { and, desc, eq, isNull, lt, or } from 'drizzle-orm'
import type { RawPostWithDetails } from '@/utils/post/domain/post.domain'
import { getDb } from '@/db'
import { postComments, posts } from '@/db/schema'

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

/* v8 ignore start */

export async function findPosts(filters: {
  courseId?: string | null
  cursor?: { createdAt: string; id: string } | null
  limit: number
}): Promise<Array<RawPostWithDetails>> {
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
  }) as Promise<Array<RawPostWithDetails>>
}

/* v8 ignore end */
