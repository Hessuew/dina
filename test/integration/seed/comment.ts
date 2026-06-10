import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import { postComments } from '@/db/schema'

export async function seedComment(overrides: {
  id?: string
  postId: string
  authorId: string
  content?: string
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(postComments).values({
    id,
    postId: overrides.postId,
    authorId: overrides.authorId,
    content: overrides.content ?? 'Test comment',
  })
  return id
}
