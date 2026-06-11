import { createServerFn } from '@tanstack/react-start'
import { getCalendarEventsService } from './service/calendar.service'

export type {
  CalendarEvent,
  SpecialEventCategory,
} from './domain/calendar.domain'

export const getCalendarEvents = createServerFn({ method: 'POST' }).handler(
  async () => getCalendarEventsService(),
)
