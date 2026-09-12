import { createServerFn } from '@tanstack/react-start'
import {
  createEventService,
  deleteEventService,
  getEventsService,
  updateEventService,
} from './service/event.service'
import type { calendarEvents } from '@/db/schema'
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
    const user = await getCurrentUser()
    return getEventsService(user.id)
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
