import { randomUUID } from 'node:crypto'
import type { LessonInsert } from '@/utils/repository'
import { insertLesson } from '@/utils/repository'

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
  const lesson = await insertLesson({
    id,
    courseId: overrides.courseId,
    title: overrides.title ?? 'Test Lesson',
    isPublished: overrides.isPublished ?? true,
    ...(overrides.scheduledTime !== undefined
      ? { scheduledTime: overrides.scheduledTime }
      : {}),
    ...(overrides.content !== undefined ? { content: overrides.content } : {}),
    ...(overrides.duration !== undefined
      ? { duration: overrides.duration }
      : {}),
  })
  return lesson.id
}
