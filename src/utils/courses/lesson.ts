import { createServerFn } from '@tanstack/react-start'
import {
  deleteLessonById,
  findAllCourseIds,
  findAssignmentCalendarEvents,
  findLessonCalendarEvents,
  findProfileById,
  findUpcomingLessons,
  insertLesson,
  updateLessonById,
} from './repository'
import {
  createLessonSchema,
  deleteLessonSchema,
  updateLessonSchema,
} from '@/schemas/lesson.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { authz, withRequestCache } from '@/utils/authz'
import { NotFoundError } from '@/utils/errors'
import { getDb } from '@/db'

export const createLesson = createServerFn({ method: 'POST' })
  .inputValidator(createLessonSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      await authz(user.id).perform('createLesson').on('course', data.courseId)

      const lesson = await insertLesson(db, {
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

      return { lesson }
    })
  })

export const updateLesson = createServerFn({ method: 'POST' })
  .inputValidator(updateLessonSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      await authz(user.id).perform('editLesson').on('course', data.courseId)

      const lesson = await updateLessonById(db, data.lessonId, {
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

      return { lesson }
    })
  })

export const deleteLesson = createServerFn({ method: 'POST' })
  .inputValidator(deleteLessonSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      await authz(user.id).perform('deleteLesson').on('course', data.courseId)
      await deleteLessonById(db, data.lessonId)

      return { success: true, lessonId: data.lessonId }
    })
  })

export const getUpcomingLessons = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await findProfileById(db, user.id)
    if (!profile) {
      throw new NotFoundError('Profile not found', {
        details: { userId: user.id },
      })
    }

    const upcomingLessons = await findUpcomingLessons(db, new Date())

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
  },
)

export const getCalendarEvents = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await findProfileById(db, user.id)
    if (!profile) {
      throw new NotFoundError('Profile not found', {
        details: { userId: user.id },
      })
    }

    const courseIds = await findAllCourseIds(db)
    if (courseIds.length === 0) return { events: [] }

    const [lessonEvents, assignmentEvents] = await Promise.all([
      findLessonCalendarEvents(db, courseIds),
      findAssignmentCalendarEvents(db, courseIds),
    ])

    const events = [
      ...lessonEvents
        .filter((l) => l.scheduledTime)
        .map((l) => ({
          id: l.id,
          title: l.title,
          date: l.scheduledTime!,
          type: 'lesson' as const,
          courseId: l.courseId,
          courseName: l.courseName,
        })),
      ...assignmentEvents.map((a) => ({
        id: a.id,
        title: a.title,
        date: a.dueDate,
        type: 'assignment' as const,
        courseId: a.courseId,
        courseName: a.courseName,
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime())

    return { events }
  },
)
