import type {
  CreateCourseInput,
  DeleteCourseInput,
  GetCourseInput,
  UpdateCourseInput,
} from '@/schemas/course.schema'
import type { LogLevel } from '@/utils/observability/logger'
import {
  assignTeachersToCourse,
  validateNewCourseTeacherPair,
} from '@/utils/courses/service/teacher-assignment.service'
import {
  buildAssignmentStats,
  buildCoursesWithProgress,
  extractTeacherIds,
} from '@/utils/courses/domain/course.domain'
import {
  isTeacherAssignmentConflict,
  resolveOptionalTeacherPair,
} from '@/utils/courses/domain/teacher-assignment.domain'
import {
  deleteCourseById,
  findAllCourses,
  findCompletedLessonProgress,
  findCourseById,
  findCourseWithDetails,
  findPublishedAssignmentsByLessonIds,
  findStudentSubmissions,
  insertCourse,
  updateCourseById,
} from '@/utils/courses/repository'
import { getUserProfile } from '@/utils/auth/auth'
import { authz } from '@/utils/authz'
import { calculateEntityPermissions } from '@/utils/authz/permissions'
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
  isAppError,
} from '@/utils/errors'
import { deleteStorageObjectStrict } from '@/utils/imageUpload/service/imageUpload.service'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import { extractPrivateStoragePath } from '@/utils/storage/domain/private-storage.domain'
import {
  signCourseThumbnailRows,
  signPrivateStoragePaths,
} from '@/utils/storage/service/private-storage.service'
import { serializeMediaRecords } from '@/utils/library/service/library.service'

type CourseAssetRow = Awaited<ReturnType<typeof findAllCourses>>[number]
type CourseDetail = NonNullable<
  Awaited<ReturnType<typeof findCourseWithDetails>>
>

type CourseMutationAction = 'createCourse' | 'updateCourse' | 'deleteCourse'

type CourseMutationLogContext = {
  action: CourseMutationAction
  actorId: string
  courseId?: string
  startedAt: number
}

function logCourseMutationEvent(
  level: LogLevel,
  event: string,
  context: CourseMutationLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    courseId: context.courseId,
    ...fields,
  })
}

function shouldLogCourseFailure(error: unknown): boolean {
  return !isAppError(error) || error.status >= 500
}

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

function restrictCourseToPublishedContent(course: CourseDetail): CourseDetail {
  return {
    ...course,
    lessons: course.lessons.filter((lesson) => lesson.isPublished),
    mediaFiles: course.mediaFiles.filter((media) => media.isPublished),
  }
}

function restrictCourseListToPublishedLessons(
  courses: ReadonlyArray<CourseAssetRow>,
  teacherId: string,
): Array<CourseAssetRow> {
  return courses.map((course) => {
    const managesCourse = course.courseTeachers.some(
      (teacher) => teacher.teacherId === teacherId,
    )
    if (managesCourse) return course
    return {
      ...course,
      lessons: course.lessons.filter((lesson) => lesson.isPublished),
    }
  })
}

export async function getCoursesService(userId: string) {
  const profile = await getUserProfile(userId)
  const isStudentView = profile.role === 'student'
  const allCourses = await findAllCourses(!isStudentView)
  const visibleCourses =
    profile.role === 'teacher'
      ? restrictCourseListToPublishedLessons(allCourses, userId)
      : allCourses

  if (!isStudentView) {
    return {
      courses: await signCourseAssets(visibleCourses),
      role: profile.role,
    }
  }

  const allLessonIds = allCourses.flatMap((course) =>
    course.lessons.map((l) => l.id),
  )
  const allAssignments = await findPublishedAssignmentsByLessonIds(allLessonIds)
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

  const course = await findCourseWithDetails(
    data.courseId,
    profile.role !== 'student',
  )

  if (!course) {
    throw new NotFoundError('Course not found', {
      code: 'COURSE_NOT_FOUND',
      details: { courseId: data.courseId },
    })
  }

  const teacherRefs = extractTeacherIds(course.courseTeachers)
  const permissions = calculateEntityPermissions(
    profile.role,
    teacherRefs,
    userId,
  )
  const visibleCourse = permissions.canManage
    ? course
    : restrictCourseToPublishedContent(course)

  let progress: Array<{ lessonId: string }> = []
  let assignmentData = {
    totalAssignments: 0,
    submittedCount: 0,
    gradedCount: 0,
  }

  if (profile.role === 'student') {
    progress = await findCompletedLessonProgress(userId)
    const lessonIds = visibleCourse.lessons.map((lesson) => lesson.id)
    const courseAssignments =
      await findPublishedAssignmentsByLessonIds(lessonIds)
    const assignmentIds = courseAssignments.map((assignment) => assignment.id)
    const studentSubmissions = await findStudentSubmissions(
      userId,
      assignmentIds,
    )
    assignmentData = buildAssignmentStats(courseAssignments, studentSubmissions)
  }

  const completedLessonIds = new Set(progress.map((item) => item.lessonId))
  const [signedCourse] = await signCourseAssets([visibleCourse])
  const courseWithTeachers = {
    ...signedCourse,
    mediaFiles: await serializeMediaRecords(visibleCourse.mediaFiles),
    ...teacherRefs,
  }

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
  const context: CourseMutationLogContext = {
    action: 'createCourse',
    actorId: userId,
    startedAt: performance.now(),
  }
  const profile = await getUserProfile(userId)
  if (profile.role !== 'admin') {
    throw new AuthorizationError('Only admins can create courses', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Non-admin attempted to create course',
      details: { role: profile.role },
    })
  }

  const teacherIds = resolveOptionalTeacherPair(
    data.teacher1Id,
    data.teacher2Id,
  )
  if (teacherIds) {
    await validateNewCourseTeacherPair(...teacherIds)
  }

  try {
    const course = await insertCourse(
      {
        title: data.title,
        description: data.description,
        thumbnailUrl: courseThumbnailPath(data.thumbnailUrl),
        isPublished: false,
        orderIndex: data.orderIndex,
      },
      teacherIds,
    )
    const [signedCourse] = await signCourseThumbnailRows([course])
    logCourseMutationEvent('info', 'course_created', context, {
      courseId: course.id,
      published: false,
    })
    return { course: signedCourse }
  } catch (error) {
    if (isTeacherAssignmentConflict(error)) {
      logCourseMutationEvent('warn', 'course_create_rejected', context, {
        status: 'conflict',
        errorCategory: 'teacher_assignment_conflict',
      })
      throw new ConflictError(
        'One or both selected teachers are already assigned to another course',
      )
    }
    if (shouldLogCourseFailure(error)) {
      logCourseMutationEvent('error', 'course_create_failed', context, {
        errorCategory: 'course_persistence',
      })
    }
    throw error
  }
}

export async function updateCourseService(
  data: UpdateCourseInput,
  userId: string,
) {
  const context: CourseMutationLogContext = {
    action: 'updateCourse',
    actorId: userId,
    courseId: data.courseId,
    startedAt: performance.now(),
  }
  const isUserAdmin = await authz(userId).isAdmin()
  if (!isUserAdmin) {
    await authz(userId).perform('editCourse').on('course', data.courseId)
  }

  try {
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
    logCourseMutationEvent('info', 'course_updated', context, {
      published: data.isPublished ?? false,
    })
    return { course: signedCourse }
  } catch (error) {
    if (shouldLogCourseFailure(error)) {
      logCourseMutationEvent('error', 'course_update_failed', context, {
        errorCategory: 'course_persistence',
      })
    }
    throw error
  }
}

export async function deleteCourseService(
  data: DeleteCourseInput,
  userId: string,
) {
  const context: CourseMutationLogContext = {
    action: 'deleteCourse',
    actorId: userId,
    courseId: data.courseId,
    startedAt: performance.now(),
  }
  const isUserAdmin = await authz(userId).isAdmin()
  if (!isUserAdmin) {
    await authz(userId).perform('deleteCourse').on('course', data.courseId)
  }

  try {
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
    logCourseMutationEvent('info', 'course_deleted', context)
  } catch (error) {
    if (shouldLogCourseFailure(error)) {
      logCourseMutationEvent('error', 'course_delete_failed', context, {
        errorCategory: 'course_persistence',
      })
    }
    throw error
  }
}
