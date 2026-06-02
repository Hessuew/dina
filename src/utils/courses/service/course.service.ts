import type {
  CreateCourseInput,
  DeleteCourseInput,
  GetCourseInput,
  UpdateCourseInput,
} from '@/schemas/course.schema'
import { assignTeachersToCourse } from '@/utils/courses/service/teacher-assignment.service'
import {
  buildAssignmentStats,
  buildCoursesWithProgress,
  extractTeacherIds,
} from '@/utils/courses/domain/course.domain'
import {
  deleteCourseById,
  findAllCourses,
  findAssignmentsByLessonIds,
  findCompletedLessonProgress,
  findCourseById,
  findCourseWithDetails,
  findStudentSubmissions,
  insertCourse,
  updateCourseById,
} from '@/utils/courses/repository'
import { getUserProfile } from '@/utils/auth/auth'
import { getSupabaseServerClient } from '@/utils/supabase'
import { authz, withRequestCache } from '@/utils/authz'
import { calculateEntityPermissions } from '@/utils/authz/permissions'
import {
  AppError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'

export async function getCoursesService(userId: string) {
  const profile = await getUserProfile(userId)
  const isStudentView = profile.role === 'student'
  const allCourses = await findAllCourses(!isStudentView)

  if (!isStudentView) {
    return { courses: allCourses, role: profile.role }
  }

  const allLessonIds = allCourses.flatMap((course) =>
    course.lessons.map((l) => l.id),
  )
  const allAssignments = await findAssignmentsByLessonIds(allLessonIds)
  const allAssignmentIds = allAssignments.map((a) => a.id)
  const allSubmissions = await findStudentSubmissions(userId, allAssignmentIds)

  const coursesWithProgress = buildCoursesWithProgress(
    allCourses,
    allAssignments,
    allSubmissions,
  )

  return { courses: coursesWithProgress, role: profile.role }
}

export async function getCourseService(data: GetCourseInput, userId: string) {
  const profile = await getUserProfile(userId)

  const isTeacherOrAdmin = profile.role !== 'student'
  const course = await findCourseWithDetails(data.courseId, isTeacherOrAdmin)

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
    progress = await findCompletedLessonProgress(userId)
    const lessonIds = course.lessons.map((lesson) => lesson.id)
    const courseAssignments = await findAssignmentsByLessonIds(lessonIds)
    const assignmentIds = courseAssignments.map((assignment) => assignment.id)
    const studentSubmissions = await findStudentSubmissions(
      userId,
      assignmentIds,
    )
    assignmentData = buildAssignmentStats(courseAssignments, studentSubmissions)
  }

  const completedLessonIds = new Set(progress.map((item) => item.lessonId))
  const courseWithTeachers = {
    ...course,
    ...extractTeacherIds(course.courseTeachers),
  }
  const permissions = calculateEntityPermissions(
    profile.role,
    courseWithTeachers,
    userId,
  )

  return {
    course: courseWithTeachers,
    role: profile.role,
    completedLessonIds: Array.from(completedLessonIds),
    assignmentData,
    permissions,
  }
}

export async function createCourseService(
  data: CreateCourseInput,
  userId: string,
) {
  const profile = await getUserProfile(userId)
  if (profile.role !== 'admin') {
    throw new AuthorizationError('Only admins can create courses', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Non-admin attempted to create course',
      details: { role: profile.role },
    })
  }

  const course = await insertCourse({
    title: data.title,
    description: data.description,
    thumbnailUrl: data.thumbnailUrl || null,
    isPublished: false,
    orderIndex: data.orderIndex,
  })

  if (data.teacher1Id && data.teacher2Id) {
    await assignTeachersToCourse(course.id, data.teacher1Id, data.teacher2Id)
  } else if (data.teacher1Id || data.teacher2Id) {
    throw new ValidationError('Please assign either both teachers or neither', {
      code: 'TEACHER_PAIR_INVALID',
      details: { teacher1Id: data.teacher1Id, teacher2Id: data.teacher2Id },
    })
  }

  return { course }
}

export async function updateCourseService(
  data: UpdateCourseInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const isUserAdmin = await authz(userId).isAdmin()
    if (!isUserAdmin) {
      await authz(userId).perform('editCourse').on('course', data.courseId)
    }

    const course = await updateCourseById(data.courseId, {
      title: data.title,
      description: data.description,
      thumbnailUrl: data.thumbnailUrl || null,
      isPublished: data.isPublished,
      orderIndex: data.orderIndex,
      updatedAt: new Date(),
    })

    if (isUserAdmin) {
      if (data.teacher1Id && data.teacher2Id) {
        await assignTeachersToCourse(
          data.courseId,
          data.teacher1Id,
          data.teacher2Id,
          true,
        )
      } else if (data.teacher1Id || data.teacher2Id) {
        throw new ValidationError(
          'Please assign either both teachers or neither',
          {
            code: 'TEACHER_PAIR_INVALID',
            details: {
              teacher1Id: data.teacher1Id,
              teacher2Id: data.teacher2Id,
            },
          },
        )
      }
    }

    return { course }
  })
}

export async function deleteCourseService(
  data: DeleteCourseInput,
  userId: string,
) {
  const supabase = getSupabaseServerClient()

  return withRequestCache(async () => {
    const isUserAdmin = await authz(userId).isAdmin()
    if (!isUserAdmin) {
      await authz(userId).perform('deleteCourse').on('course', data.courseId)
    }

    const course = await findCourseById(data.courseId)
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

    await deleteCourseById(data.courseId)
  })
}
