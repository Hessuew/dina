import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq } from 'drizzle-orm'
import z from 'zod'
import { db } from '@/db'
import {
  assignments,
  courses,
  enrollments,
  lessonProgress,
  lessons,
  profiles,
} from '@/db/schema'
import { getCurrentUser } from '@/utils/auth'

export const getCourses = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getCurrentUser()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    if (profile.role === 'teacher' || profile.role === 'admin') {
      const teacherCourses = await db.query.courses.findMany({
        where: eq(courses.teacherId, user.id),
        with: {
          lessons: {
            orderBy: (l, { asc }) => [asc(l.orderIndex)],
          },
        },
        orderBy: [desc(courses.createdAt)],
      })

      return {
        courses: teacherCourses,
        role: profile.role,
      }
    }

    const allCourses = await db.query.courses.findMany({
      with: {
        teacher: true,
        lessons: {
          orderBy: (l, { asc }) => [asc(l.orderIndex)],
        },
      },
      orderBy: [desc(courses.createdAt)],
    })

    const coursesWithProgress = await Promise.all(
      allCourses.map(async (course) => {
        const progress = await db.query.lessonProgress.findMany({
          where: and(
            eq(lessonProgress.studentId, user.id),
            eq(lessonProgress.completed, true),
          ),
        })

        const completedLessonIds = new Set(progress.map((p) => p.lessonId))
        const completedCount = course.lessons.filter((lesson) =>
          completedLessonIds.has(lesson.id),
        ).length

        return {
          ...course,
          completedLessons: completedCount,
          totalLessons: course.lessons.length,
        }
      }),
    )

    return {
      courses: coursesWithProgress,
      role: profile.role,
    }
  },
)

export const getUpcomingLessons = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getCurrentUser()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    const { gt } = await import('drizzle-orm')
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

export const getCalendarEvents = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getCurrentUser()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    let courseIds: Array<string> = []

    if (profile.role === 'teacher' || profile.role === 'admin') {
      const teacherCourses = await db.query.courses.findMany({
        where: eq(courses.teacherId, user.id),
        columns: { id: true },
      })
      courseIds = teacherCourses.map((c) => c.id)
    } else {
      const studentEnrollments = await db.query.enrollments.findMany({
        where: and(
          eq(enrollments.studentId, user.id),
          eq(enrollments.status, 'active'),
        ),
        columns: { courseId: true },
      })
      courseIds = studentEnrollments.map((e) => e.courseId)
    }

    if (courseIds.length === 0) {
      return { events: [] }
    }

    const { inArray } = await import('drizzle-orm')

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

export const createCourse = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      thumbnailUrl: z.string().url().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
      throw new Error('Only teachers can create courses')
    }

    const [course] = await db
      .insert(courses)
      .values({
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl || null,
        teacherId: user.id,
        isPublished: false,
      })
      .returning()

    return { course }
  })

export const updateCourse = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      courseId: string
      title: string
      description: string
      thumbnailUrl?: string
      isPublished?: boolean
    }) => d,
  )
  .handler(async ({ data }) => {
    const { requireTeacherOfCourse } = await import('@/utils/auth')
    const user = await getCurrentUser()

    await requireTeacherOfCourse(user.id, data.courseId)

    const [course] = await db
      .update(courses)
      .set({
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl || null,
        isPublished: data.isPublished,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, data.courseId))
      .returning()

    return { course }
  })

export const deleteCourse = createServerFn({ method: 'POST' })
  .inputValidator((d: { courseId: string }) => d)
  .handler(async ({ data }) => {
    const { requireTeacherOfCourse } = await import('@/utils/auth')
    const user = await getCurrentUser()

    await requireTeacherOfCourse(user.id, data.courseId)

    await db.delete(courses).where(eq(courses.id, data.courseId))

    return { success: true }
  })

export const createLesson = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      courseId: string
      title: string
      content?: string
      videoUrl?: string
      thumbnailUrl?: string
      scheduledTime?: Date
      duration?: number
      orderIndex: number
      isPublished?: boolean
    }) => d,
  )
  .handler(async ({ data }) => {
    const { requireTeacherOfCourse } = await import('@/utils/auth')
    const user = await getCurrentUser()

    await requireTeacherOfCourse(user.id, data.courseId)

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

export const updateLesson = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      lessonId: string
      courseId: string
      title: string
      content?: string
      videoUrl?: string
      thumbnailUrl?: string
      scheduledTime?: Date
      duration?: number
      orderIndex?: number
      isPublished?: boolean
    }) => d,
  )
  .handler(async ({ data }) => {
    const { requireTeacherOfCourse } = await import('@/utils/auth')
    const user = await getCurrentUser()

    await requireTeacherOfCourse(user.id, data.courseId)

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

export const deleteLesson = createServerFn({ method: 'POST' })
  .inputValidator((d: { lessonId: string; courseId: string }) => d)
  .handler(async ({ data }) => {
    const { requireTeacherOfCourse } = await import('@/utils/auth')
    const user = await getCurrentUser()

    await requireTeacherOfCourse(user.id, data.courseId)

    await db.delete(lessons).where(eq(lessons.id, data.lessonId))

    return { success: true, lessonId: data.lessonId }
  })
