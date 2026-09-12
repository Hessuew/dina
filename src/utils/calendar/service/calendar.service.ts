import { buildCalendarEvents } from '@/utils/calendar/domain/calendar.domain'
import { getUserProfile } from '@/utils/auth/auth'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import {
  findAllCalendarEvents,
  findPublishedAssignmentsWithCourses,
  findPublishedLessonsWithCourses,
} from '@/utils/calendar/repository'

export async function getCalendarEventsService(userId: string) {
  // Keep the service safe for direct callers too: the route's auth boundary is
  // not an API authorization boundary.
  await getUserProfile(userId)
  const startedAt = performance.now()

  try {
    const [lessons, assignments, specialEvents] = await Promise.all([
      findPublishedLessonsWithCourses(),
      findPublishedAssignmentsWithCourses(),
      findAllCalendarEvents(),
    ])
    const events = buildCalendarEvents(lessons, assignments, specialEvents)

    logServerEvent('info', 'calendar_events_loaded', {
      requestId: getRequestId(),
      path: 'serverFn:getCalendarEvents',
      status: 'success',
      durationMs: elapsedMs(startedAt),
      actorId: userId,
      eventCount: events.length,
      lessonCount: lessons.length,
      assignmentCount: assignments.length,
      specialEventCount: specialEvents.length,
    })

    return { events }
  } catch (error) {
    logServerEvent('error', 'calendar_events_load_failed', {
      requestId: getRequestId(),
      path: 'serverFn:getCalendarEvents',
      status: 'failure',
      durationMs: elapsedMs(startedAt),
      actorId: userId,
      errorCategory: 'calendar_read_persistence',
    })
    throw error
  }
}
