import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import { calendarEvents } from '@/db/schema'

export async function seedCalendarEvent(
  overrides: {
    id?: string
    courseId?: string | null
    title?: string
    description?: string
    startTime?: Date
    endTime?: Date
    category?: 'exam' | 'chapel' | 'personal'
  } = {},
): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const start = overrides.startTime ?? new Date()
  const db = await getDb()
  await db.insert(calendarEvents).values({
    id,
    courseId: overrides.courseId ?? null,
    title: overrides.title ?? 'Test Event',
    startTime: start,
    endTime: overrides.endTime ?? start,
    ...(overrides.description !== undefined
      ? { description: overrides.description }
      : {}),
    ...(overrides.category !== undefined
      ? { category: overrides.category }
      : {}),
  })
  return id
}
