import { and, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { postCommentReactions } from '@/db/schema'

export type PostCommentReactionInsert = typeof postCommentReactions.$inferInsert

/* v8 ignore start */
export async function findPostCommentReaction(
  commentId: string,
  userId: string,
) {
  const db = await getDb()
  return db.query.postCommentReactions.findFirst({
    where: and(
      eq(postCommentReactions.commentId, commentId),
      eq(postCommentReactions.userId, userId),
    ),
  })
}

export async function insertPostCommentReaction(
  values: PostCommentReactionInsert,
): Promise<void> {
  const db = await getDb()
  await db.insert(postCommentReactions).values(values)
}

export async function updatePostCommentReaction(
  id: string,
  emoji: string,
): Promise<void> {
  const db = await getDb()
  await db
    .update(postCommentReactions)
    .set({ emoji })
    .where(eq(postCommentReactions.id, id))
}

export async function deletePostCommentReaction(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(postCommentReactions).where(eq(postCommentReactions.id, id))
}
/* v8 ignore end */
