import {
  buildCalendarEvents,
  composeCalendarEventRows,
} from '@/utils/calendar/domain/calendar.domain'
import { getUserProfile } from '@/utils/auth/auth'
import { isAppError } from '@/utils/errors'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import {
  findAllCalendarEvents,
  findCoursesByIds,
  findLessonsByIds,
  findPublishedAssignments,
  findPublishedScheduledLessons,
} from '@/utils/repository'

export async function getCalendarEventsService(userId: string) {
  const startedAt = performance.now()

  try {
    // Keep the service safe for direct callers too: the route's auth boundary
    // is not an API authorization boundary.
    await getUserProfile(userId)
    const [lessonSources, assignmentSources, specialEvents] = await Promise.all(
      [
        findPublishedScheduledLessons(),
        findPublishedAssignments(),
        findAllCalendarEvents(),
      ],
    )
    const assignmentLessons = await findLessonsByIds(
      assignmentSources.map((assignment) => assignment.lessonId),
    )
    const courseIds = new Set([
      ...lessonSources.map((lesson) => lesson.courseId),
      ...assignmentLessons.map((lesson) => lesson.courseId),
    ])
    const courses = await findCoursesByIds(Array.from(courseIds))
    const { lessons, assignments } = composeCalendarEventRows(
      lessonSources,
      assignmentSources,
      courses,
      assignmentLessons,
    )
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
    if (!isAppError(error) || error.status >= 500) {
      logServerEvent('error', 'calendar_events_load_failed', {
        requestId: getRequestId(),
        path: 'serverFn:getCalendarEvents',
        status: 'failure',
        durationMs: elapsedMs(startedAt),
        actorId: userId,
        errorCategory: 'calendar_read_persistence',
      })
    }
    throw error
  }
}
