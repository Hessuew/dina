import type {
  GetCourseTeachersInput,
  UpdateCourseTeachersInput,
} from '@/schemas/course.schema'
import type { LogLevel } from '@/utils/observability/logger'
import {
  validateSameTeacher,
  validateTeacherRoles,
} from '@/utils/courses/domain/teacher-assignment.domain'
import {
  findCourseAssignmentsByTeacherIds,
  findCourseById,
  findCourseTeachers,
  findTeachersByIds,
  replaceTeacherAssignments,
} from '@/utils/courses/repository'
import { getUserProfile } from '@/utils/auth/auth'
import { authz } from '@/utils/authz'
import { ConflictError, NotFoundError, isAppError } from '@/utils/errors'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import { signAvatarRows } from '@/utils/storage/service/private-storage.service'

type CourseTeacherAssignmentLogContext = {
  actorId: string
  courseId: string
  teacher1Id: string
  teacher2Id: string
  startedAt: number
}

type CourseTeacherReadContext = {
  actorId: string
  courseId: string
  startedAt: number
}

function logCourseTeacherAssignmentEvent(
  level: LogLevel,
  event: string,
  context: CourseTeacherAssignmentLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: 'serverFn:updateCourseTeachers',
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    courseId: context.courseId,
    teacher1Id: context.teacher1Id,
    teacher2Id: context.teacher2Id,
    ...fields,
  })
}

function shouldLogCourseTeacherAssignmentFailure(error: unknown): boolean {
  return !isAppError(error) || error.status >= 500
}

function logCourseTeacherReadEvent(
  level: LogLevel,
  event: string,
  context: CourseTeacherReadContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: 'serverFn:getCourseTeachers',
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    courseId: context.courseId,
    ...fields,
  })
}

async function withCourseTeacherReadTelemetry<T>(
  context: CourseTeacherReadContext,
  read: () => Promise<T>,
  fields: (result: T) => Record<string, unknown>,
): Promise<T> {
  try {
    const result = await read()
    logCourseTeacherReadEvent(
      'info',
      'course_teachers_loaded',
      context,
      fields(result),
    )
    return result
  } catch (error) {
    if (!isAppError(error) || error.status >= 500) {
      logCourseTeacherReadEvent(
        'error',
        'course_teachers_load_failed',
        context,
        { errorCategory: 'course_teacher_read_persistence' },
      )
    }
    throw error
  }
}

export async function validateTeacherPair(
  teacher1Id: string,
  teacher2Id: string,
  allowAdmin = false,
): Promise<void> {
  validateSameTeacher(teacher1Id, teacher2Id)
  const teachers = await findTeachersByIds([teacher1Id, teacher2Id])
  validateTeacherRoles(teachers, teacher1Id, teacher2Id, allowAdmin)
}

export async function validateNewCourseTeacherPair(
  teacher1Id: string,
  teacher2Id: string,
): Promise<void> {
  await validateTeacherPair(teacher1Id, teacher2Id, true)
  const assignments = await findCourseAssignmentsByTeacherIds([
    teacher1Id,
    teacher2Id,
  ])
  if (assignments.length > 0) {
    throw new ConflictError(
      'One or both selected teachers are already assigned to another course',
    )
  }
}

export async function assignTeachersToCourse(
  courseId: string,
  teacher1Id: string,
  teacher2Id: string,
  allowAdmin = false,
): Promise<void> {
  await validateTeacherPair(teacher1Id, teacher2Id, allowAdmin)
  await replaceTeacherAssignments(courseId, teacher1Id, teacher2Id)
}

export async function getCourseTeachersService(
  data: GetCourseTeachersInput,
  userId: string,
) {
  await getUserProfile(userId)
  const context: CourseTeacherReadContext = {
    actorId: userId,
    courseId: data.courseId,
    startedAt: performance.now(),
  }

  return withCourseTeacherReadTelemetry(
    context,
    async () => {
      const courseTeachersList = await findCourseTeachers(data.courseId)
      return {
        teachers: await signAvatarRows(
          courseTeachersList.map((ct) => ct.teacher),
        ),
      }
    },
    (result) => ({ teacherCount: result.teachers.length }),
  )
}

export async function updateCourseTeachersService(
  data: UpdateCourseTeachersInput,
  userId: string,
) {
  await authz(userId).hasRole('admin')
  const context: CourseTeacherAssignmentLogContext = {
    actorId: userId,
    courseId: data.courseId,
    teacher1Id: data.teacher1Id,
    teacher2Id: data.teacher2Id,
    startedAt: performance.now(),
  }

  try {
    const course = await findCourseById(data.courseId)
    if (!course) {
      throw new NotFoundError('Course not found', {
        code: 'COURSE_NOT_FOUND',
        details: { courseId: data.courseId },
      })
    }

    await assignTeachersToCourse(
      data.courseId,
      data.teacher1Id,
      data.teacher2Id,
    )
    logCourseTeacherAssignmentEvent('info', 'course_teachers_updated', context)

    return { success: true }
  } catch (error) {
    if (shouldLogCourseTeacherAssignmentFailure(error)) {
      logCourseTeacherAssignmentEvent(
        'error',
        'course_teachers_update_failed',
        context,
        { errorCategory: 'course_teacher_assignment_persistence' },
      )
    }
    throw error
  }
}
