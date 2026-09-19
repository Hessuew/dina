import { randomUUID } from 'node:crypto'
import { insertPostCommentReaction } from '@/utils/repository'

export async function seedCommentReaction(overrides: {
  id?: string
  commentId: string
  userId: string
  emoji?: string
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  await insertPostCommentReaction({
    id,
    commentId: overrides.commentId,
    userId: overrides.userId,
    emoji: overrides.emoji ?? '👍',
  })
  return id
}
