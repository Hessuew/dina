import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray } from 'drizzle-orm'
import z from 'zod'
import { assignTeachersToCourse } from './teacher-assignment'
import { getDb } from '@/db'
import { deleteCourseSchema, updateCourseSchema } from '@/schemas/course.schema'
import {
  assignments,
  courses,
  lessonProgress,
  profiles,
  submissions,
} from '@/db/schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { getSupabaseServerClient } from '@/utils/supabase'
import { authz, withRequestCache } from '@/utils/authz'
import { calculateEntityPermissions } from '@/utils/authz/permissions'
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'

export const getCourses = createServerFn({ method: 'POST' }).handler(
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

    // Admins and teachers see all courses
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

    if (profile.role === 'admin' || profile.role === 'teacher') {
      return {
        courses: allCourses,
        role: profile.role,
      }
    }

    const coursesWithProgress = await Promise.all(
      allCourses.map(async (course) => {
        const lessonIds = course.lessons.map((l) => l.id)

        const courseAssignments =
          lessonIds.length > 0
            ? await db.query.assignments.findMany({
                where: inArray(assignments.lessonId, lessonIds),
              })
            : []

        const assignmentIds = courseAssignments.map((a) => a.id)

        const studentSubmissions =
          assignmentIds.length > 0
            ? await db.query.submissions.findMany({
                where: and(
                  eq(submissions.studentId, user.id),
                  inArray(submissions.assignmentId, assignmentIds),
                ),
              })
            : []

        const totalAssignments = courseAssignments.length
        const submittedCount = studentSubmissions.filter(
          (s) => s.status === 'submitted',
        ).length
        const gradedCount = studentSubmissions.filter(
          (s) => s.status === 'graded',
        ).length

        return {
          ...course,
          submittedAssignments: submittedCount,
          gradedAssignments: gradedCount,
          totalAssignments,
        }
      }),
    )

    return {
      courses: coursesWithProgress,
      role: profile.role,
    }
  },
)

export const getCourse = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ courseId: z.uuid() }))
  .handler(async ({ data }) => {
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

    const isTeacherOrAdmin = profile.role !== 'student'

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, data.courseId),
      with: {
        courseTeachers: {
          with: {
            teacher: true,
          },
        },
        lessons: {
          orderBy: (lessons, { asc }) => [asc(lessons.orderIndex)],
        },
        mediaFiles: {
          where: isTeacherOrAdmin ? undefined : (t) => eq(t.isPublished, true),
          orderBy: (t, { desc }) => [desc(t.createdAt)],
        },
      },
    })

    if (!course) {
      throw new NotFoundError('Course not found', {
        code: 'COURSE_NOT_FOUND',
        details: { courseId: data.courseId },
      })
    }

    let progress: Array<{ lessonId: string }> = []
    let assignmentData = {
      totalAssignments: 0,
      submittedCount: 0,
      gradedCount: 0,
    }

    if (profile.role === 'student') {
      progress = await db.query.lessonProgress.findMany({
        where: and(
          eq(lessonProgress.studentId, user.id),
          eq(lessonProgress.completed, true),
        ),
        columns: {
          lessonId: true,
        },
      })

      const lessonIds = course.lessons.map((lesson) => lesson.id)
      const courseAssignments =
        lessonIds.length > 0
          ? await db.query.assignments.findMany({
              where: inArray(assignments.lessonId, lessonIds),
            })
          : []

      const assignmentIds = courseAssignments.map((assignment) => assignment.id)
      const studentSubmissions =
        assignmentIds.length > 0
          ? await db.query.submissions.findMany({
              where: and(
                eq(submissions.studentId, user.id),
                inArray(submissions.assignmentId, assignmentIds),
              ),
            })
          : []

      assignmentData = {
        totalAssignments: courseAssignments.length,
        submittedCount: studentSubmissions.filter(
          (submission) => submission.status === 'submitted',
        ).length,
        gradedCount: studentSubmissions.filter(
          (submission) => submission.status === 'graded',
        ).length,
      }
    }

    const completedLessonIds = new Set(progress.map((item) => item.lessonId))

    const courseWithTeachers = {
      ...course,
      teacher1Id: course.courseTeachers[0]?.teacherId ?? null,
      teacher2Id: course.courseTeachers[1]?.teacherId ?? null,
    }

    const permissions = calculateEntityPermissions(
      profile.role,
      courseWithTeachers,
      user.id,
    )

    return {
      course: courseWithTeachers,
      role: profile.role,
      completedLessonIds: Array.from(completedLessonIds),
      assignmentData,
      user,
      permissions,
    }
  })

export const createCourse = createServerFn({ method: 'POST' })
  .inputValidator(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      thumbnailUrl: z.url().optional(),
      teacher1Id: z.uuid().optional(),
      teacher2Id: z.uuid().optional(),
      orderIndex: z.number().int().min(0).default(0),
    }),
  )
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    if (!profile || profile.role !== 'admin') {
      throw new AuthorizationError('Only admins can create courses', {
        code: 'ROLE_REQUIRED',
        internalMessage: 'Non-admin attempted to create course',
        details: { role: profile?.role },
      })
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

    // Optionally assign teachers if provided
    if (data.teacher1Id && data.teacher2Id) {
      await assignTeachersToCourse(
        db,
        course.id,
        data.teacher1Id,
        data.teacher2Id,
      )
    } else if (data.teacher1Id || data.teacher2Id) {
      throw new ValidationError(
        'Please assign either both teachers or neither',
        {
          code: 'TEACHER_PAIR_INVALID',
          details: { teacher1Id: data.teacher1Id, teacher2Id: data.teacher2Id },
        },
      )
    }

    return { course }
  })

export const updateCourse = createServerFn({ method: 'POST' })
  .inputValidator(updateCourseSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()

    return withRequestCache(async () => {
      const db = await getDb()

      // Admins can update any course, teachers can only update their own
      const isUserAdmin = await authz(user.id).isAdmin()
      if (!isUserAdmin) {
        await authz(user.id).perform('editCourse').on('course', data.courseId)
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
      if (isUserAdmin && data.teacher1Id && data.teacher2Id) {
        await assignTeachersToCourse(
          db,
          data.courseId,
          data.teacher1Id,
          data.teacher2Id,
          true, // allow admin role
        )
      }

      return { course }
    })
  })

export const deleteCourse = createServerFn({ method: 'POST' })
  .inputValidator(deleteCourseSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const supabase = getSupabaseServerClient()

    return withRequestCache(async () => {
      const db = await getDb()

      const isUserAdmin = await authz(user.id).isAdmin()
      if (!isUserAdmin) {
        await authz(user.id).perform('deleteCourse').on('course', data.courseId)
      }

      // Get course to retrieve thumbnail URL
      const course = await db.query.courses.findFirst({
        where: eq(courses.id, data.courseId),
      })

      if (!course) {
        throw new NotFoundError('Course not found', {
          code: 'COURSE_NOT_FOUND',
          details: { courseId: data.courseId },
        })
      }

      // Delete thumbnail from Supabase Storage if exists
      if (course.thumbnailUrl) {
        const oldPath = course.thumbnailUrl.split('/').pop()
        if (oldPath) {
          const { error: deleteError } = await supabase.storage
            .from('course-thumbnails')
            .remove([oldPath])
          if (deleteError) {
            console.log('⚠️ Failed to delete course thumbnail', {
              error: deleteError,
            })
          }
        }
      }

      // Delete course record
      await db.delete(courses).where(eq(courses.id, data.courseId))
    })
  })
