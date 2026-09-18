import { and, desc, eq, isNull, lt, or } from 'drizzle-orm'
import type {
  PostAuthor,
  PostReaction,
  RawComment,
} from '@/utils/post/domain/post.domain'
import { getDb } from '@/db'
import { postComments, posts } from '@/db/schema'

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

export async function findChannels() {
  const db = await getDb()
  return db.query.courses.findMany({
    columns: { id: true, title: true, orderIndex: true, isPublished: true },
    with: { courseTeachers: { columns: { teacherId: true } } },
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

/* v8 ignore end */
