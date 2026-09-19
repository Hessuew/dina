import { randomUUID } from 'node:crypto'
import { insertPostReaction } from '@/utils/repository'

export async function seedPostReaction(overrides: {
  id?: string
  postId: string
  userId: string
  emoji?: string
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  await insertPostReaction({
    id,
    postId: overrides.postId,
    userId: overrides.userId,
    emoji: overrides.emoji ?? '👍',
  })
  return id
}
