import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import {
  createEventService,
  deleteEventService,
  updateEventService,
} from './service/event.service'
import { getDb } from '@/db'
import { calendarEvents, courses } from '@/db/schema'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  createEventSchema,
  deleteEventSchema,
  updateEventSchema,
} from '@/schemas/event.schema'

export type CalendarEventRow = typeof calendarEvents.$inferSelect & {
  courseName: string | null
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
    const user = await getCurrentUser()
    return createEventService(data, user.id)
  })

export const updateEvent = createServerFn({ method: 'POST' })
  .inputValidator(updateEventSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return updateEventService(data, user.id)
  })

export const deleteEvent = createServerFn({ method: 'POST' })
  .inputValidator(deleteEventSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    await deleteEventService(data, user.id)
  })
