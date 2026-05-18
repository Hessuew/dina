import { createServerFn } from '@tanstack/react-start'
import {
  findAllCalendarEvents,
  findPublishedAssignmentsWithCourses,
  findPublishedLessonsWithCourses,
} from './repository'
import { buildCalendarEvents } from './domain/calendar.domain'

export type { CalendarEvent, SpecialEventCategory } from './domain/calendar.domain'

export const getCalendarEvents = createServerFn({ method: 'POST' }).handler(
  async () => {
    const [lessons, assignments, specialEvents] = await Promise.all([
      findPublishedLessonsWithCourses(),
      findPublishedAssignmentsWithCourses(),
      findAllCalendarEvents(),
    ])

    return { events: buildCalendarEvents(lessons, assignments, specialEvents) }
  },
)
