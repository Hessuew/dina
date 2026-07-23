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
import { authz } from '@/utils/authz'
import { calculateEntityPermissions } from '@/utils/authz/permissions'
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'
import { deleteStorageObjectStrict } from '@/utils/imageUpload/service/imageUpload.service'
import { extractPrivateStoragePath } from '@/utils/storage/domain/private-storage.domain'
import {
  signCourseThumbnailRows,
  signPrivateStoragePaths,
} from '@/utils/storage/service/private-storage.service'
import { serializeMediaRecords } from '@/utils/library/service/library.service'

type CourseAssetRow = Awaited<ReturnType<typeof findAllCourses>>[number]

async function signCourseAssets<T extends CourseAssetRow>(
  rows: ReadonlyArray<T>,
): Promise<Array<T>> {
  const thumbnailPaths = rows.map((row) => row.thumbnailUrl)
  const avatarPaths = rows.flatMap((row) =>
    row.courseTeachers.map((entry) => entry.teacher.avatarUrl),
  )
  const [thumbnails, avatars] = await Promise.all([
    signPrivateStoragePaths('course-thumbnails', thumbnailPaths),
    signPrivateStoragePaths('avatars', avatarPaths),
  ])
  return rows.map((row) => ({
    ...row,
    thumbnailUrl: thumbnails.get(row.thumbnailUrl ?? '') ?? null,
    courseTeachers: row.courseTeachers.map((entry) => ({
      ...entry,
      teacher: {
        ...entry.teacher,
        avatarUrl: avatars.get(entry.teacher.avatarUrl ?? '') ?? null,
      },
    })),
  }))
}

function courseThumbnailPath(value: string | null | undefined): string | null {
  if (!value) return null
  const path = extractPrivateStoragePath(value, 'course-thumbnails')
  if (!path) throw new ValidationError('Invalid course thumbnail path')
  return path
}

export async function getCoursesService(userId: string) {
  const profile = await getUserProfile(userId)
  const isStudentView = profile.role === 'student'
  const allCourses = await findAllCourses(!isStudentView)

  if (!isStudentView) {
    return {
      courses: await signCourseAssets(allCourses),
      role: profile.role,
    }
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

  return {
    courses: await signCourseAssets(coursesWithProgress),
    role: profile.role,
  }
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
  const [signedCourse] = await signCourseAssets([course])
  const courseWithTeachers = {
    ...signedCourse,
    mediaFiles: await serializeMediaRecords(course.mediaFiles),
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
    thumbnailUrl: courseThumbnailPath(data.thumbnailUrl),
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

  const [signedCourse] = await signCourseThumbnailRows([course])
  return { course: signedCourse }
}

export async function updateCourseService(
  data: UpdateCourseInput,
  userId: string,
) {
  const isUserAdmin = await authz(userId).isAdmin()
  if (!isUserAdmin) {
    await authz(userId).perform('editCourse').on('course', data.courseId)
  }

  const course = await updateCourseById(data.courseId, {
    title: data.title,
    description: data.description,
    thumbnailUrl: courseThumbnailPath(data.thumbnailUrl),
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

  const [signedCourse] = await signCourseThumbnailRows([course])
  return { course: signedCourse }
}

export async function deleteCourseService(
  data: DeleteCourseInput,
  userId: string,
) {
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
    await deleteStorageObjectStrict(
      'course-thumbnails',
      course.thumbnailUrl,
      'Failed to delete course thumbnail',
    )
  }

  await deleteCourseById(data.courseId)
}
