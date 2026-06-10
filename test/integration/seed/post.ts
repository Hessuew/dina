import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import { posts } from '@/db/schema'

export async function seedPost(overrides: {
  id?: string
  authorId: string
  courseId?: string
  content?: string
  deletedAt?: Date
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(posts).values({
    id,
    authorId: overrides.authorId,
    content: overrides.content ?? 'Test post',
    ...(overrides.courseId !== undefined
      ? { courseId: overrides.courseId }
      : {}),
    ...(overrides.deletedAt !== undefined
      ? { deletedAt: overrides.deletedAt }
      : {}),
  })
  return id
}
