import type {
  CompleteLessonInput,
  CreateLessonInput,
  DeleteLessonInput,
  UpdateLessonInput,
} from '@/schemas/lesson.schema'
import type { LogLevel } from '@/utils/observability/logger'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import {
  completeLessonProgress,
  deleteLessonById,
  findAllCourseIds,
  findAssignmentCalendarEvents,
  findLessonCalendarEvents,
  findLessonForCompletion,
  findLessonProgress,
  findUpcomingLessons,
  insertLesson,
  isCourseCompleted,
  updateLessonById,
} from '@/utils/courses/repository'
import { buildCourseCalendarEvents } from '@/utils/courses/domain/course.domain'
import { getUserProfile } from '@/utils/auth/auth'
import { authz } from '@/utils/authz'
import { AuthorizationError, NotFoundError, isAppError } from '@/utils/errors'

type LessonMutationAction =
  'createLesson' | 'updateLesson' | 'deleteLesson' | 'completeLesson'

type LessonMutationLogContext = {
  action: LessonMutationAction
  actorId: string
  courseId?: string
  lessonId?: string
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

async function loadLessonCompletionPreflight(
  data: CompleteLessonInput,
  userId: string,
  context: LessonMutationLogContext,
) {
  let lesson: Awaited<ReturnType<typeof findLessonForCompletion>>
  try {
    lesson = await findLessonForCompletion(data.lessonId)
  } catch (error) {
    if (shouldLogLessonPreflightFailure(error)) {
      logLessonMutationEvent('error', 'lesson_completion_failed', context, {
        errorCategory: 'lesson_read_persistence',
      })
    }
    throw error
  }

  if (!lesson) {
    throw new NotFoundError('Lesson not found', {
      code: 'LESSON_NOT_FOUND',
      details: { lessonId: data.lessonId },
    })
  }
  if (!lesson.isPublished) {
    throw new AuthorizationError('Lesson not available', {
      details: { lessonId: data.lessonId },
    })
  }

  context.courseId = lesson.courseId

  let progress: Awaited<ReturnType<typeof findLessonProgress>>
  try {
    progress = await findLessonProgress(userId, lesson.id)
  } catch (error) {
    if (shouldLogLessonPreflightFailure(error)) {
      logLessonMutationEvent('error', 'lesson_completion_failed', context, {
        errorCategory: 'lesson_progress_read_persistence',
      })
    }
    throw error
  }

  return { lesson, progress }
}

export async function createLessonService(
  data: CreateLessonInput,
  userId: string,
) {
  const context: LessonMutationLogContext = {
    action: 'createLesson',
    actorId: userId,
    courseId: data.courseId,
    startedAt: performance.now(),
  }
  await authz(userId).perform('createLesson').on('course', data.courseId)

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
    startedAt: performance.now(),
  }
  await authz(userId).perform('editLesson').on('course', data.courseId)

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
    startedAt: performance.now(),
  }
  await authz(userId).perform('deleteLesson').on('course', data.courseId)
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

export async function completeLessonService(
  data: CompleteLessonInput,
  userId: string,
) {
  const context: LessonMutationLogContext = {
    action: 'completeLesson',
    actorId: userId,
    lessonId: data.lessonId,
    startedAt: performance.now(),
  }
  await authz(userId).hasRole('student')

  const { lesson, progress } = await loadLessonCompletionPreflight(
    data,
    userId,
    context,
  )

  try {
    const updatedProgress = await completeLessonProgress(userId, lesson.id)
    const alreadyCompleted = Boolean(progress?.completed)
    const courseCompleted =
      !alreadyCompleted && (await isCourseCompleted(userId, lesson.courseId))
    logLessonMutationEvent(
      'info',
      alreadyCompleted ? 'lesson_completion_ignored' : 'lesson_completed',
      context,
      {
        status: alreadyCompleted ? 'ignored' : 'success',
        alreadyCompleted,
        courseCompleted,
      },
    )
    return {
      lessonId: lesson.id,
      completed: true,
      alreadyCompleted,
      courseCompleted,
      progress: updatedProgress,
    }
  } catch (error) {
    logLessonMutationEvent('error', 'lesson_completion_failed', context, {
      errorCategory: 'lesson_progress_persistence',
    })
    throw error
  }
}

export async function getUpcomingLessonsService(userId: string) {
  await getUserProfile(userId)
  const startedAt = performance.now()

  try {
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
    logServerEvent('error', 'upcoming_lessons_load_failed', {
      requestId: getRequestId(),
      path: 'serverFn:getUpcomingLessons',
      status: 'failure',
      durationMs: elapsedMs(startedAt),
      actorId: userId,
      errorCategory: 'upcoming_lessons_read_persistence',
    })
    throw error
  }
}

export async function getCalendarEventsService(userId: string) {
  await getUserProfile(userId)
  const startedAt = performance.now()

  try {
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
    logServerEvent('error', 'course_calendar_events_load_failed', {
      requestId: getRequestId(),
      path: 'serverFn:getCalendarEvents',
      status: 'failure',
      durationMs: elapsedMs(startedAt),
      actorId: userId,
      errorCategory: 'course_calendar_read_persistence',
    })
    throw error
  }
}
