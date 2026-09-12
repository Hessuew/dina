import { createServerFn } from '@tanstack/react-start'
import { getCalendarEventsService } from './service/calendar.service'
import { getCurrentUser } from '@/utils/auth/auth'

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
  async () => {
    const user = await getCurrentUser()
    return getCalendarEventsService(user.id)
  },
)
