import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import { courses } from '@/db/schema'

export async function seedCourse(
  overrides: { id?: string; title?: string } = {},
): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(courses).values({
    id,
    title: overrides.title ?? 'Test Course',
  })
  return id
}
