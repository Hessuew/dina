import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import { lessonProgress } from '@/db/schema'

export async function seedLessonProgress(overrides: {
  id?: string
  studentId: string
  lessonId: string
  completed?: boolean
  completedAt?: Date
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(lessonProgress).values({
    id,
    studentId: overrides.studentId,
    lessonId: overrides.lessonId,
    ...(overrides.completed !== undefined
      ? { completed: overrides.completed }
      : {}),
    ...(overrides.completedAt !== undefined
      ? { completedAt: overrides.completedAt }
      : {}),
  })
  return id
}
