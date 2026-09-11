import { buildCalendarEvents } from '@/utils/calendar/domain/calendar.domain'
import { getUserProfile } from '@/utils/auth/auth'
import {
  findAllCalendarEvents,
  findPublishedAssignmentsWithCourses,
  findPublishedLessonsWithCourses,
} from '@/utils/calendar/repository'

export async function getCalendarEventsService(userId: string) {
  // Keep the service safe for direct callers too: the route's auth boundary is
  // not an API authorization boundary.
  await getUserProfile(userId)

  const [lessons, assignments, specialEvents] = await Promise.all([
    findPublishedLessonsWithCourses(),
    findPublishedAssignmentsWithCourses(),
    findAllCalendarEvents(),
  ])

  return { events: buildCalendarEvents(lessons, assignments, specialEvents) }
}
