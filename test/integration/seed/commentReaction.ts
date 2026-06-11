import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import { postCommentReactions } from '@/db/schema'

export async function seedCommentReaction(overrides: {
  id?: string
  commentId: string
  userId: string
  emoji?: string
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(postCommentReactions).values({
    id,
    commentId: overrides.commentId,
    userId: overrides.userId,
    emoji: overrides.emoji ?? '👍',
  })
  return id
}
