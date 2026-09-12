import type { LogLevel } from '@/utils/observability/logger'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import { sortTeachers } from '@/utils/teachers/domain/teachers.domain'
import {
  findAllTeachers,
  findAllTeachersSimple,
  findCourseAssignmentsForTeachers,
  findCourseTeacher,
} from '@/utils/teachers/repository'
import { authz } from '@/utils/authz'
import { getUserProfile } from '@/utils/auth/auth'
import { findPrivilegesForUsers } from '@/utils/staff-privilege/repository'
import { signAvatarRows } from '@/utils/storage/service/private-storage.service'

type TeacherDirectoryReadAction = 'getTeachers' | 'getAllTeachers'

type TeacherDirectoryReadContext = {
  action: TeacherDirectoryReadAction
  actorId: string
  startedAt: number
}

function logTeacherDirectoryEvent(
  level: LogLevel,
  event: string,
  context: TeacherDirectoryReadContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    ...fields,
  })
}

async function withTeacherDirectoryTelemetry<T>(
  context: TeacherDirectoryReadContext,
  read: () => Promise<T>,
  fields: (result: T) => Record<string, unknown>,
): Promise<T> {
  try {
    const result = await read()
    logTeacherDirectoryEvent('info', 'teacher_directory_loaded', context, {
      ...fields(result),
    })
    return result
  } catch (error) {
    logTeacherDirectoryEvent(
      'error',
      'teacher_directory_load_failed',
      context,
      { errorCategory: 'teacher_directory_read_persistence' },
    )
    throw error
  }
}

export async function getTeachersService(actorId: string) {
  const profile = await getUserProfile(actorId)
  const context: TeacherDirectoryReadContext = {
    action: 'getTeachers',
    actorId,
    startedAt: performance.now(),
  }

  return withTeacherDirectoryTelemetry(
    context,
    async () => {
      const teachers = await signAvatarRows(await findAllTeachers())

      const teacherIds = teachers.map((t) => t.id)
      const isAdmin = profile.role === 'admin'
      const granted = isAdmin
        ? await findPrivilegesForUsers(teacherIds)
        : new Map<string, Array<never>>()
      const allAssignments = await findCourseAssignmentsForTeachers(teacherIds)

      // Results are ordered by createdAt desc; first occurrence per teacher = most recent.
      const assignmentByTeacher = new Map<
        string,
        (typeof allAssignments)[number]
      >()
      for (const a of allAssignments) {
        if (!assignmentByTeacher.has(a.teacherId)) {
          assignmentByTeacher.set(a.teacherId, a)
        }
      }

      const teachersWithCourses = teachers.map((teacher) => ({
        id: teacher.id,
        fullName: teacher.fullName,
        email: teacher.email,
        bio: teacher.bio,
        avatarUrl: teacher.avatarUrl,
        createdAt: teacher.createdAt,
        role: teacher.role,
        course: assignmentByTeacher.get(teacher.id)?.course,
        lecturerTitle: teacher.lecturerTitle,
        gemstone: teacher.gemstone ?? null,
        staffPrivileges: isAdmin ? (granted.get(teacher.id) ?? []) : undefined,
      }))

      return { teachers: sortTeachers(teachersWithCourses) }
    },
    (result) => ({ teacherCount: result.teachers.length }),
  )
}

export async function getAllTeachersService(userId: string) {
  await authz(userId).hasRole('admin')
  const context: TeacherDirectoryReadContext = {
    action: 'getAllTeachers',
    actorId: userId,
    startedAt: performance.now(),
  }

  return withTeacherDirectoryTelemetry(
    context,
    async () => {
      const rows = await signAvatarRows(await findAllTeachersSimple())
      const teachers = rows.map(({ courseTeachers, ...teacher }) => ({
        ...teacher,
        courseId: courseTeachers[0]?.courseId ?? null,
      }))

      return { teachers }
    },
    (result) => ({ teacherCount: result.teachers.length }),
  )
}

export async function isCourseTeacherService(courseId: string, userId: string) {
  const assignment = await findCourseTeacher(courseId, userId)
  return { isCourseTeacher: Boolean(assignment) }
}
