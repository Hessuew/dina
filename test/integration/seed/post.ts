import { randomUUID } from 'node:crypto'
import { insertPost } from '@/utils/repository'

export async function seedPost(overrides: {
  id?: string
  authorId: string
  courseId?: string
  content?: string
  deletedAt?: Date
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  await insertPost({
    id,
    authorId: overrides.authorId,
    content: overrides.content ?? 'Test post',
    courseId: overrides.courseId ?? null,
    ...(overrides.deletedAt !== undefined
      ? { deletedAt: overrides.deletedAt }
      : {}),
  })
  return id
}
