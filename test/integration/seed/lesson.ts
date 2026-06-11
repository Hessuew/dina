import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import { lessons } from '@/db/schema'

export async function seedLesson(overrides: {
  id?: string
  courseId: string
  title?: string
  isPublished?: boolean
  scheduledTime?: Date
  content?: string
  duration?: number
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(lessons).values({
    id,
    courseId: overrides.courseId,
    title: overrides.title ?? 'Test Lesson',
    ...(overrides.isPublished !== undefined
      ? { isPublished: overrides.isPublished }
      : {}),
    ...(overrides.scheduledTime !== undefined
      ? { scheduledTime: overrides.scheduledTime }
      : {}),
    ...(overrides.content !== undefined ? { content: overrides.content } : {}),
    ...(overrides.duration !== undefined
      ? { duration: overrides.duration }
      : {}),
  })
  return id
}
