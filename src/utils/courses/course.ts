import { createServerFn } from '@tanstack/react-start'
import z from 'zod'
import { assignTeachersToCourse } from './teacher-assignment'
import { buildAssignmentStats, extractTeacherIds } from './domain/course.domain'
import {
  deleteCourseById,
  findAllCourses,
  findAssignmentsByLessonIds,
  findCompletedLessonProgress,
  findCourseById,
  findCourseWithDetails,
  findProfileById,
  findStudentSubmissions,
  insertCourse,
  updateCourseById,
} from './repository'
import { deleteCourseSchema, updateCourseSchema } from '@/schemas/course.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { getSupabaseServerClient } from '@/utils/supabase'
import { authz, withRequestCache } from '@/utils/authz'
import { calculateEntityPermissions } from '@/utils/authz/permissions'
import {
  AppError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'
import { getDb } from '@/db'

export const getCourses = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await findProfileById(db, user.id)
    if (!profile) {
      throw new NotFoundError('Profile not found', {
        details: { userId: user.id },
      })
    }

    const allCourses = await findAllCourses(db)

    if (profile.role === 'admin' || profile.role === 'teacher') {
      return { courses: allCourses, role: profile.role }
    }

    // Batch query all assignments and submissions to avoid N+1
    const allLessonIds = allCourses.flatMap((course) =>
      course.lessons.map((l) => l.id),
    )
    const allAssignments = await findAssignmentsByLessonIds(db, allLessonIds)
    const allAssignmentIds = allAssignments.map((a) => a.id)
    const allSubmissions = await findStudentSubmissions(
      db,
      user.id,
      allAssignmentIds,
    )

    // Group assignments by lessonId and submissions by assignmentId for efficient lookup
    const assignmentsByLessonId = new Map<string, typeof allAssignments>()
    for (const assignment of allAssignments) {
      const existing = assignmentsByLessonId.get(assignment.lessonId)
      if (existing) {
        existing.push(assignment)
      } else {
        assignmentsByLessonId.set(assignment.lessonId, [assignment])
      }
    }

    const submissionsByAssignmentId = new Map<string, typeof allSubmissions>()
    for (const submission of allSubmissions) {
      const existing = submissionsByAssignmentId.get(submission.assignmentId)
      if (existing) {
        existing.push(submission)
      } else {
        submissionsByAssignmentId.set(submission.assignmentId, [submission])
      }
    }

    const coursesWithProgress = allCourses.map((course) => {
      const courseAssignments = course.lessons.flatMap(
        (lesson) => assignmentsByLessonId.get(lesson.id) || [],
      )
      const courseSubmissions = courseAssignments.flatMap(
        (assignment) => submissionsByAssignmentId.get(assignment.id) || [],
      )
      const { totalAssignments, submittedCount, gradedCount } =
        buildAssignmentStats(courseAssignments, courseSubmissions)
      return {
        ...course,
        submittedAssignments: submittedCount,
        gradedAssignments: gradedCount,
        totalAssignments,
      }
    })

    return { courses: coursesWithProgress, role: profile.role }
  },
)

export const getCourse = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ courseId: z.uuid() }))
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    const profile = await findProfileById(db, user.id)
    if (!profile) {
      throw new NotFoundError('Profile not found', {
        details: { userId: user.id },
      })
    }

    const isTeacherOrAdmin = profile.role !== 'student'
    const course = await findCourseWithDetails(
      db,
      data.courseId,
      isTeacherOrAdmin,
    )

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
      progress = await findCompletedLessonProgress(db, user.id)
      const lessonIds = course.lessons.map((lesson) => lesson.id)
      const courseAssignments = await findAssignmentsByLessonIds(db, lessonIds)
      const assignmentIds = courseAssignments.map((assignment) => assignment.id)
      const studentSubmissions = await findStudentSubmissions(
        db,
        user.id,
        assignmentIds,
      )
      assignmentData = buildAssignmentStats(
        courseAssignments,
        studentSubmissions,
      )
    }

    const completedLessonIds = new Set(progress.map((item) => item.lessonId))
    const courseWithTeachers = {
      ...course,
      ...extractTeacherIds(course.courseTeachers),
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

    const profile = await findProfileById(db, user.id)
    if (!profile || profile.role !== 'admin') {
      throw new AuthorizationError('Only admins can create courses', {
        code: 'ROLE_REQUIRED',
        internalMessage: 'Non-admin attempted to create course',
        details: { role: profile?.role },
      })
    }

    const course = await insertCourse(db, {
      title: data.title,
      description: data.description,
      thumbnailUrl: data.thumbnailUrl || null,
      isPublished: false,
      orderIndex: data.orderIndex,
    })

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

      const isUserAdmin = await authz(user.id).isAdmin()
      if (!isUserAdmin) {
        await authz(user.id).perform('editCourse').on('course', data.courseId)
      }

      const course = await updateCourseById(db, data.courseId, {
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl || null,
        isPublished: data.isPublished,
        orderIndex: data.orderIndex,
        updatedAt: new Date(),
      })

      if (isUserAdmin && data.teacher1Id && data.teacher2Id) {
        await assignTeachersToCourse(
          db,
          data.courseId,
          data.teacher1Id,
          data.teacher2Id,
          true,
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

      const course = await findCourseById(db, data.courseId)
      if (!course) {
        throw new NotFoundError('Course not found', {
          code: 'COURSE_NOT_FOUND',
          details: { courseId: data.courseId },
        })
      }

      if (course.thumbnailUrl) {
        const oldPath = course.thumbnailUrl.split('/').pop()
        if (oldPath) {
          const { error: deleteError } = await supabase.storage
            .from('course-thumbnails')
            .remove([oldPath])
          if (deleteError) {
            console.error('Failed to delete course thumbnail from storage', {
              courseId: data.courseId,
              path: oldPath,
              error: deleteError.message,
            })
            throw new AppError({
              code: 'STORAGE_OPERATION_FAILED',
              status: 500,
              userMessage: 'Failed to delete course thumbnail',
              internalMessage: `Storage deletion failed for course ${data.courseId}: ${deleteError.message}`,
              details: {
                courseId: data.courseId,
                path: oldPath,
                error: deleteError,
              },
            })
          }
        }
      }

      await deleteCourseById(db, data.courseId)
    })
  })
