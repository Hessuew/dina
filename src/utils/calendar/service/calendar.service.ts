import { buildCalendarEvents } from '@/utils/calendar/domain/calendar.domain'
import {
  findAllCalendarEvents,
  findPublishedAssignmentsWithCourses,
  findPublishedLessonsWithCourses,
} from '@/utils/calendar/repository'

export async function getCalendarEventsService() {
  const [lessons, assignments, specialEvents] = await Promise.all([
    findPublishedLessonsWithCourses(),
    findPublishedAssignmentsWithCourses(),
    findAllCalendarEvents(),
  ])

  return { events: buildCalendarEvents(lessons, assignments, specialEvents) }
}
