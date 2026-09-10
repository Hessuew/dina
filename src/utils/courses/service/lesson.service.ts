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

type LessonMutationAction = 'createLesson' | 'updateLesson' | 'deleteLesson'

type LessonMutationLogContext = {
  action: LessonMutationAction
  actorId: string
  courseId: string
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

export async function getUpcomingLessonsService(userId: string) {
  await getUserProfile(userId)

  const upcomingLessons = await findUpcomingLessons(new Date())

  return {
    lessons: upcomingLessons.map((l) => ({
      id: l.id,
      title: l.title,
      scheduledTime: l.scheduledTime!,
      thumbnailUrl: l.thumbnailUrl,
      courseId: l.courseId,
      courseName: l.courseName,
    })),
  }
}

export async function getCalendarEventsService(userId: string) {
  await getUserProfile(userId)

  const courseIds = await findAllCourseIds()
  if (courseIds.length === 0) return { events: [] }

  const [lessonEvents, assignmentEvents] = await Promise.all([
    findLessonCalendarEvents(courseIds),
    findAssignmentCalendarEvents(courseIds),
  ])

  return { events: buildCourseCalendarEvents(lessonEvents, assignmentEvents) }
}
