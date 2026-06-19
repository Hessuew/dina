import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { calendarEvents, courses } from '@/db/schema'
import {
  createEventSchema,
  deleteEventSchema,
  updateEventSchema,
} from '@/schemas/event.schema'
import { buildEventValues } from '@/utils/event/domain/event-input.domain'

export type CalendarEventRow = {
  id: string
  title: string
  description: string | null
  startTime: Date
  endTime: Date
  location: string | null
  zoomLink: string | null
  category: 'exam' | 'chapel' | 'personal' | null
  courseId: string | null
  courseName: string | null
  createdAt: Date
  updatedAt: Date
}

export const getEvents = createServerFn({ method: 'POST' }).handler(
  async () => {
    const db = await getDb()
    const rows = await db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        description: calendarEvents.description,
        startTime: calendarEvents.startTime,
        endTime: calendarEvents.endTime,
        location: calendarEvents.location,
        zoomLink: calendarEvents.zoomLink,
        category: calendarEvents.category,
        courseId: calendarEvents.courseId,
        courseName: courses.title,
        createdAt: calendarEvents.createdAt,
        updatedAt: calendarEvents.updatedAt,
      })
      .from(calendarEvents)
      .leftJoin(courses, eq(calendarEvents.courseId, courses.id))
      .orderBy(asc(calendarEvents.startTime))

    return {
      events: rows.map((r) => ({
        ...r,
        courseName: r.courseName ?? null,
      })) as Array<CalendarEventRow>,
    }
  },
)

export const createEvent = createServerFn({ method: 'POST' })
  .inputValidator(createEventSchema)
  .handler(async ({ data }) => {
    const db = await getDb()
    const [event] = await db
      .insert(calendarEvents)
      .values(buildEventValues(data))
      .returning()

    return { event }
  })

export const updateEvent = createServerFn({ method: 'POST' })
  .inputValidator(updateEventSchema)
  .handler(async ({ data }) => {
    const db = await getDb()
    const [event] = await db
      .update(calendarEvents)
      .set({ ...buildEventValues(data), updatedAt: new Date() })
      .where(eq(calendarEvents.id, data.eventId))
      .returning()

    return { event }
  })

export const deleteEvent = createServerFn({ method: 'POST' })
  .inputValidator(deleteEventSchema)
  .handler(async ({ data }) => {
    const db = await getDb()
    await db.delete(calendarEvents).where(eq(calendarEvents.id, data.eventId))
  })
