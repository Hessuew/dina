import { and, eq, isNull } from 'drizzle-orm'
import { getDb } from '@/db'
import { posts } from '@/db/schema'

export type PostRow = typeof posts.$inferSelect

/* v8 ignore start */
export async function findPostForWrite(
  postId: string,
): Promise<PostRow | undefined> {
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
