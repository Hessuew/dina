import { createServerFn } from '@tanstack/react-start'
import { and, eq, gt, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import {
  createLessonSchema,
  deleteLessonSchema,
  updateLessonSchema,
} from '@/schemas/lesson.schema'
import { assignments, courses, lessons, profiles } from '@/db/schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { authz, withRequestCache } from '@/utils/authz'
import { NotFoundError } from '@/utils/errors'

export const createLesson = createServerFn({ method: 'POST' })
  .inputValidator(createLessonSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      await authz(user.id).perform('createLesson').on('course', data.courseId)

      const [lesson] = await db
        .insert(lessons)
        .values({
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
        .returning()

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

      const [lesson] = await db
        .update(lessons)
        .set({
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
        .where(eq(lessons.id, data.lessonId))
        .returning()

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

      await db.delete(lessons).where(eq(lessons.id, data.lessonId))

      return { success: true, lessonId: data.lessonId }
    })
  })

export const getUpcomingLessons = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new NotFoundError('Profile not found', {
        details: { userId: user.id },
      })
    }

    const now = new Date()

    // For both students and teachers, show ALL lessons from all courses
    const upcomingLessons = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        scheduledTime: lessons.scheduledTime,
        thumbnailUrl: lessons.thumbnailUrl,
        courseId: lessons.courseId,
        courseName: courses.title,
        isPublished: lessons.isPublished,
      })
      .from(lessons)
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(and(gt(lessons.scheduledTime, now), eq(lessons.isPublished, true)))
      .orderBy(lessons.scheduledTime)
      .limit(5)

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

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new NotFoundError('Profile not found', {
        details: { userId: user.id },
      })
    }

    const courseIds = (
      await db.query.courses.findMany({
        columns: { id: true },
      })
    ).map((c) => c.id)

    if (courseIds.length === 0) {
      return { events: [] }
    }

    const upcomingLessons = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        scheduledTime: lessons.scheduledTime,
        courseId: lessons.courseId,
        courseName: courses.title,
      })
      .from(lessons)
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(inArray(courses.id, courseIds))

    const upcomingAssignments = await db
      .select({
        id: assignments.id,
        title: assignments.title,
        dueDate: assignments.dueDate,
        courseId: lessons.courseId,
        courseName: courses.title,
      })
      .from(assignments)
      .innerJoin(lessons, eq(assignments.lessonId, lessons.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(inArray(courses.id, courseIds))

    const events = [
      ...upcomingLessons
        .filter((l) => l.scheduledTime)
        .map((l) => ({
          id: l.id,
          title: l.title,
          date: l.scheduledTime!,
          type: 'lesson' as const,
          courseId: l.courseId,
          courseName: l.courseName,
        })),
      ...upcomingAssignments.map((a) => ({
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
