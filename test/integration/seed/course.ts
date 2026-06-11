import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import { courses } from '@/db/schema'

export async function seedCourse(
  overrides: { id?: string; title?: string; thumbnailUrl?: string } = {},
): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(courses).values({
    id,
    title: overrides.title ?? 'Test Course',
    ...(overrides.thumbnailUrl !== undefined
      ? { thumbnailUrl: overrides.thumbnailUrl }
      : {}),
  })
  return id
}
