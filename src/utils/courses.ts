import { createServerFn } from '@tanstack/react-start'
import { and, eq, gt, inArray } from 'drizzle-orm'
import z from 'zod'
import { db } from '@/db'
import {
  deleteCourseSchema,
  updateCourseSchema,
  updateCourseTeachersSchema,
} from '@/schemas/course.schema'
import {
  createLessonSchema,
  deleteLessonSchema,
  updateLessonSchema,
} from '@/schemas/lesson.schema'
import {
  assignments,
  courseTeachers,
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

    if (profile.role === 'admin') {
      // Admins see all courses
      const allCourses = await db.query.courses.findMany({
        with: {
          courseTeachers: {
            with: {
              teacher: true,
            },
          },
          lessons: {
            orderBy: (l, { asc }) => [asc(l.orderIndex)],
          },
        },
        orderBy: (c, { asc }) => [asc(c.orderIndex)],
      })

      return {
        courses: allCourses,
        role: profile.role,
      }
    }

    if (profile.role === 'teacher') {
      // Get courses where user is assigned as a teacher
      const teacherAssignments = await db.query.courseTeachers.findMany({
        where: eq(courseTeachers.teacherId, user.id),
        with: {
          course: {
            with: {
              lessons: {
                orderBy: (l, { asc }) => [asc(l.orderIndex)],
              },
              courseTeachers: {
                with: {
                  teacher: true,
                },
              },
            },
          },
        },
      })

      const teacherCourses = teacherAssignments.map(
        (assignment) => assignment.course,
      )

      return {
        courses: teacherCourses,
        role: profile.role,
      }
    }

    const allCourses = await db.query.courses.findMany({
      with: {
        courseTeachers: {
          with: {
            teacher: true,
          },
        },
        lessons: {
          orderBy: (l, { asc }) => [asc(l.orderIndex)],
        },
      },
      orderBy: (c, { asc }) => [asc(c.orderIndex)],
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
      // Get courses where user is assigned as a teacher
      const teacherAssignments = await db.query.courseTeachers.findMany({
        where: eq(courseTeachers.teacherId, user.id),
        columns: { courseId: true },
      })
      courseIds = teacherAssignments.map((a) => a.courseId)
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
      thumbnailUrl: z.url().optional(),
      teacher1Id: z.uuid(),
      teacher2Id: z.uuid(),
      orderIndex: z.number().int().min(0).default(0),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile || profile.role !== 'admin') {
      throw new Error('Only admins can create courses')
    }

    // Validate that exactly 2 different teachers are provided
    if (data.teacher1Id === data.teacher2Id) {
      throw new Error('Must assign 2 different teachers to a course')
    }

    // Verify both teachers exist and have teacher role
    const teachers = await db.query.profiles.findMany({
      where: inArray(profiles.id, [data.teacher1Id, data.teacher2Id]),
    })

    if (teachers.length !== 2) {
      throw new Error('One or both teachers not found')
    }

    const teacher1 = teachers.find((t) => t.id === data.teacher1Id)
    const teacher2 = teachers.find((t) => t.id === data.teacher2Id)

    if (teacher1?.role !== 'teacher') {
      throw new Error(`${teacher1?.fullName || 'Teacher 1'} is not a teacher`)
    }
    if (teacher2?.role !== 'teacher') {
      throw new Error(`${teacher2?.fullName || 'Teacher 2'} is not a teacher`)
    }

    // Create course
    const [course] = await db
      .insert(courses)
      .values({
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl || null,
        isPublished: false,
        orderIndex: data.orderIndex,
      })
      .returning()

    // Assign both teachers to the course
    await db.insert(courseTeachers).values([
      {
        courseId: course.id,
        teacherId: data.teacher1Id,
      },
      {
        courseId: course.id,
        teacherId: data.teacher2Id,
      },
    ])

    return { course }
  })

export const updateCourse = createServerFn({ method: 'POST' })
  .inputValidator(updateCourseSchema)
  .handler(async ({ data }) => {
    const { requireTeacherOfCourse, isAdmin } = await import('@/utils/auth')
    const user = await getCurrentUser()

    const userIsAdmin = await isAdmin(user.id)

    // Teachers can update their courses, admins can update any course
    if (!userIsAdmin) {
      await requireTeacherOfCourse(user.id, data.courseId)
    }

    // Update course basic info
    const [course] = await db
      .update(courses)
      .set({
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl || null,
        isPublished: data.isPublished,
        orderIndex: data.orderIndex,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, data.courseId))
      .returning()

    // If admin is updating teachers
    if (userIsAdmin && data.teacher1Id && data.teacher2Id) {
      // Validate that exactly 2 different teachers are provided
      if (data.teacher1Id === data.teacher2Id) {
        throw new Error('Must assign 2 different teachers to a course')
      }

      // Verify both teachers exist and have teacher role
      const teachers = await db.query.profiles.findMany({
        where: inArray(profiles.id, [data.teacher1Id, data.teacher2Id]),
      })

      if (teachers.length !== 2) {
        throw new Error('One or both teachers not found')
      }

      const teacher1 = teachers.find((t) => t.id === data.teacher1Id)
      const teacher2 = teachers.find((t) => t.id === data.teacher2Id)

      if (teacher1?.role !== 'teacher') {
        throw new Error(`${teacher1?.fullName || 'Teacher 1'} is not a teacher`)
      }
      if (teacher2?.role !== 'teacher') {
        throw new Error(`${teacher2?.fullName || 'Teacher 2'} is not a teacher`)
      }

      // Delete existing teacher assignments
      await db
        .delete(courseTeachers)
        .where(eq(courseTeachers.courseId, data.courseId))

      // Insert new teacher assignments
      await db.insert(courseTeachers).values([
        {
          courseId: data.courseId,
          teacherId: data.teacher1Id,
        },
        {
          courseId: data.courseId,
          teacherId: data.teacher2Id,
        },
      ])
    }

    return { course }
  })

export const deleteCourse = createServerFn({ method: 'POST' })
  .inputValidator(deleteCourseSchema)
  .handler(async ({ data }) => {
    const { requireTeacherOfCourse, isAdmin } = await import('@/utils/auth')
    const user = await getCurrentUser()

    const userIsAdmin = await isAdmin(user.id)

    // Teachers can delete their courses, admins can delete any course
    if (!userIsAdmin) {
      await requireTeacherOfCourse(user.id, data.courseId)
    }

    await db.delete(courses).where(eq(courses.id, data.courseId))

    return { success: true }
  })

export const createLesson = createServerFn({ method: 'POST' })
  .inputValidator(createLessonSchema)
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
  .inputValidator(updateLessonSchema)
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
  .inputValidator(deleteLessonSchema)
  .handler(async ({ data }) => {
    const { requireTeacherOfCourse } = await import('@/utils/auth')
    const user = await getCurrentUser()

    await requireTeacherOfCourse(user.id, data.courseId)

    await db.delete(lessons).where(eq(lessons.id, data.lessonId))

    return { success: true, lessonId: data.lessonId }
  })

export const getAllTeachers = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await getCurrentUser()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile || profile.role !== 'admin') {
      throw new Error('Only admins can view all teachers')
    }

    const teachers = await db.query.profiles.findMany({
      where: inArray(profiles.role, ['teacher', 'admin']),
      columns: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
      },
      orderBy: (p, { asc }) => [asc(p.fullName)],
    })

    return { teachers }
  },
)

export const getCourseTeachers = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ courseId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    const courseTeachersList = await db.query.courseTeachers.findMany({
      where: eq(courseTeachers.courseId, data.courseId),
      with: {
        teacher: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    })

    return {
      teachers: courseTeachersList.map((ct) => ct.teacher),
    }
  })

export const updateCourseTeachers = createServerFn({ method: 'POST' })
  .inputValidator(updateCourseTeachersSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile || profile.role !== 'admin') {
      throw new Error('Only admins can update course teachers')
    }

    // Validate that exactly 2 different teachers are provided
    if (data.teacher1Id === data.teacher2Id) {
      throw new Error('Must assign 2 different teachers to a course')
    }

    // Verify both teachers exist and have teacher role
    const teachers = await db.query.profiles.findMany({
      where: inArray(profiles.id, [data.teacher1Id, data.teacher2Id]),
    })

    if (teachers.length !== 2) {
      throw new Error('One or both teachers not found')
    }

    const teacher1 = teachers.find((t) => t.id === data.teacher1Id)
    const teacher2 = teachers.find((t) => t.id === data.teacher2Id)

    if (teacher1?.role !== 'teacher') {
      throw new Error(`${teacher1?.fullName || 'Teacher 1'} is not a teacher`)
    }
    if (teacher2?.role !== 'teacher') {
      throw new Error(`${teacher2?.fullName || 'Teacher 2'} is not a teacher`)
    }

    // Verify course exists
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, data.courseId),
    })

    if (!course) {
      throw new Error('Course not found')
    }

    // Delete existing teacher assignments
    await db
      .delete(courseTeachers)
      .where(eq(courseTeachers.courseId, data.courseId))

    // Insert new teacher assignments
    await db.insert(courseTeachers).values([
      {
        courseId: data.courseId,
        teacherId: data.teacher1Id,
      },
      {
        courseId: data.courseId,
        teacherId: data.teacher2Id,
      },
    ])

    return { success: true }
  })
