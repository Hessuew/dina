import { randomUUID } from 'node:crypto'
import type { CalendarEventInsert } from '@/utils/repository'
import { insertCalendarEvent } from '@/utils/repository'

export async function seedCalendarEvent(
  overrides: {
    id?: string
    courseId?: string | null
    title?: string
    description?: string
    startTime?: Date
    endTime?: Date
    category?: CalendarEventInsert['category']
  } = {},
): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const start = overrides.startTime ?? new Date()
  const event = await insertCalendarEvent({
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
  return event.id
}
