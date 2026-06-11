import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import { postReactions } from '@/db/schema'

export async function seedPostReaction(overrides: {
  id?: string
  postId: string
  userId: string
  emoji?: string
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(postReactions).values({
    id,
    postId: overrides.postId,
    userId: overrides.userId,
    emoji: overrides.emoji ?? '👍',
  })
  return id
}
