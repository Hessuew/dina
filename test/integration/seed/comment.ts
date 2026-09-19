import { randomUUID } from 'node:crypto'
import { insertComment } from '@/utils/repository'

export async function seedComment(overrides: {
  id?: string
  postId: string
  authorId: string
  content?: string
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  await insertComment({
    id,
    postId: overrides.postId,
    authorId: overrides.authorId,
    content: overrides.content ?? 'Test comment',
  })
  return id
}
