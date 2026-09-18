import { and, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { postReactions } from '@/db/schema'

export type PostReactionInsert = typeof postReactions.$inferInsert

/* v8 ignore start */
export async function findPostReaction(postId: string, userId: string) {
  const db = await getDb()
  return db.query.postReactions.findFirst({
    where: and(
      eq(postReactions.postId, postId),
      eq(postReactions.userId, userId),
    ),
  })
}

export async function insertPostReaction(
  values: PostReactionInsert,
): Promise<void> {
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
/* v8 ignore end */
