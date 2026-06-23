import { createServerFn } from '@tanstack/react-start'
import { getCalendarEventsService } from './service/calendar.service'

export type {
  CalendarCourse,
  CalendarEvent,
  SpecialEventCategory,
} from './domain/calendar.domain'
export {
  deriveCalendarCourses,
  deriveUpcomingEvents,
  deriveUpcomingSpecials,
  filterCalendarEvents,
  parseCalendarMonth,
} from './domain/calendar.domain'

export const getCalendarEvents = createServerFn({ method: 'POST' }).handler(
  async () => getCalendarEventsService(),
)
