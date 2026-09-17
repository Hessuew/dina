import type {
  CreateLessonInput,
  DeleteLessonInput,
  UpdateLessonInput,
} from '@/schemas/lesson.schema'
import type { LogLevel } from '@/utils/observability/logger'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import {
  deleteLessonById,
  findAllCourseIds,
  findAssignmentCalendarEvents,
  findLessonCalendarEvents,
  findUpcomingLessons,
  insertLesson,
  updateLessonById,
} from '@/utils/courses/repository'
import { buildCourseCalendarEvents } from '@/utils/courses/domain/course.domain'
import { getUserProfile } from '@/utils/auth/auth'
import { authz } from '@/utils/authz'
import { isAppError } from '@/utils/errors'

type LessonMutationAction = 'createLesson' | 'updateLesson' | 'deleteLesson'

type LessonMutationLogContext = {
  action: LessonMutationAction
  actorId: string
  courseId?: string
  lessonId?: string
  failureEvent: string
  startedAt: number
}

function logLessonMutationEvent(
  level: LogLevel,
  event: string,
  context: LessonMutationLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    courseId: context.courseId,
    lessonId: context.lessonId,
    ...fields,
  })
}

function shouldLogLessonPreflightFailure(error: unknown): boolean {
  return !isAppError(error) || error.status >= 500
}

async function requireLessonAuthorization(
  context: LessonMutationLogContext,
  authorize: () => Promise<unknown>,
): Promise<void> {
  try {
    await authorize()
  } catch (error) {
    if (shouldLogLessonPreflightFailure(error)) {
      logLessonMutationEvent('error', context.failureEvent, context, {
        errorCategory: 'lesson_authorization_persistence',
      })
    }
    throw error
  }
}

export async function createLessonService(
  data: CreateLessonInput,
  userId: string,
) {
  const context: LessonMutationLogContext = {
    action: 'createLesson',
    actorId: userId,
    courseId: data.courseId,
    failureEvent: 'lesson_create_failed',
    startedAt: performance.now(),
  }
  await requireLessonAuthorization(context, () =>
    authz(userId).perform('createLesson').on('course', data.courseId),
  )

  try {
    const lesson = await insertLesson({
      courseId: data.courseId,
      title: data.title,
      content: data.content || null,
      videoUrl: data.videoUrl || null,
      thumbnailUrl: data.thumbnailUrl || null,
      scheduledTime: data.scheduledTime || null,
      duration: data.duration || null,
      orderIndex: data.orderIndex,
      isPublished: data.isPublished ?? false,
    })

    logLessonMutationEvent('info', 'lesson_created', {
      ...context,
      lessonId: lesson.id,
    })
    return { lesson }
  } catch (error) {
    logLessonMutationEvent('error', 'lesson_create_failed', context, {
      errorCategory: 'lesson_persistence',
    })
    throw error
  }
}

export async function updateLessonService(
  data: UpdateLessonInput,
  userId: string,
) {
  const context: LessonMutationLogContext = {
    action: 'updateLesson',
    actorId: userId,
    courseId: data.courseId,
    lessonId: data.lessonId,
    failureEvent: 'lesson_update_failed',
    startedAt: performance.now(),
  }
  await requireLessonAuthorization(context, () =>
    authz(userId).perform('editLesson').on('course', data.courseId),
  )

  try {
    const lesson = await updateLessonById(data.lessonId, {
      title: data.title,
      content: data.content || null,
      videoUrl: data.videoUrl || null,
      thumbnailUrl: data.thumbnailUrl || null,
      scheduledTime: data.scheduledTime || null,
      duration: data.duration || null,
      orderIndex: data.orderIndex,
      isPublished: data.isPublished,
      updatedAt: new Date(),
    })

    logLessonMutationEvent('info', 'lesson_updated', context)
    return { lesson }
  } catch (error) {
    logLessonMutationEvent('error', 'lesson_update_failed', context, {
      errorCategory: 'lesson_persistence',
    })
    throw error
  }
}

export async function deleteLessonService(
  data: DeleteLessonInput,
  userId: string,
) {
  const context: LessonMutationLogContext = {
    action: 'deleteLesson',
    actorId: userId,
    courseId: data.courseId,
    lessonId: data.lessonId,
    failureEvent: 'lesson_delete_failed',
    startedAt: performance.now(),
  }
  await requireLessonAuthorization(context, () =>
    authz(userId).perform('deleteLesson').on('course', data.courseId),
  )
  try {
    await deleteLessonById(data.lessonId)
    logLessonMutationEvent('info', 'lesson_deleted', context)
  } catch (error) {
    logLessonMutationEvent('error', 'lesson_delete_failed', context, {
      errorCategory: 'lesson_persistence',
    })
    throw error
  }

  return { success: true, lessonId: data.lessonId }
}

export async function getUpcomingLessonsService(userId: string) {
  const startedAt = performance.now()

  try {
    await getUserProfile(userId)
    const upcomingLessons = await findUpcomingLessons(new Date())
    const lessons = upcomingLessons.map((l) => ({
      id: l.id,
      title: l.title,
      scheduledTime: l.scheduledTime!,
      thumbnailUrl: l.thumbnailUrl,
      courseId: l.courseId,
      courseName: l.courseName,
    }))

    logServerEvent('info', 'upcoming_lessons_loaded', {
      requestId: getRequestId(),
      path: 'serverFn:getUpcomingLessons',
      status: 'success',
      durationMs: elapsedMs(startedAt),
      actorId: userId,
      lessonCount: lessons.length,
    })

    return { lessons }
  } catch (error) {
    if (shouldLogLessonPreflightFailure(error)) {
      logServerEvent('error', 'upcoming_lessons_load_failed', {
        requestId: getRequestId(),
        path: 'serverFn:getUpcomingLessons',
        status: 'failure',
        durationMs: elapsedMs(startedAt),
        actorId: userId,
        errorCategory: 'upcoming_lessons_read_persistence',
      })
    }
    throw error
  }
}

export async function getCalendarEventsService(userId: string) {
  const startedAt = performance.now()

  try {
    await getUserProfile(userId)
    const courseIds = await findAllCourseIds()
    if (courseIds.length === 0) {
      logServerEvent('info', 'course_calendar_events_loaded', {
        requestId: getRequestId(),
        path: 'serverFn:getCalendarEvents',
        status: 'success',
        durationMs: elapsedMs(startedAt),
        actorId: userId,
        courseCount: 0,
        lessonEventCount: 0,
        assignmentEventCount: 0,
        eventCount: 0,
      })
      return { events: [] }
    }

    const [lessonEvents, assignmentEvents] = await Promise.all([
      findLessonCalendarEvents(courseIds),
      findAssignmentCalendarEvents(courseIds),
    ])
    const events = buildCourseCalendarEvents(lessonEvents, assignmentEvents)

    logServerEvent('info', 'course_calendar_events_loaded', {
      requestId: getRequestId(),
      path: 'serverFn:getCalendarEvents',
      status: 'success',
      durationMs: elapsedMs(startedAt),
      actorId: userId,
      courseCount: courseIds.length,
      lessonEventCount: lessonEvents.length,
      assignmentEventCount: assignmentEvents.length,
      eventCount: events.length,
    })

    return { events }
  } catch (error) {
    if (shouldLogLessonPreflightFailure(error)) {
      logServerEvent('error', 'course_calendar_events_load_failed', {
        requestId: getRequestId(),
        path: 'serverFn:getCalendarEvents',
        status: 'failure',
        durationMs: elapsedMs(startedAt),
        actorId: userId,
        errorCategory: 'course_calendar_read_persistence',
      })
    }
    throw error
  }
}
