import {
  findAllAssignments,
  findAllCourses,
  findAllCoursesDesc,
  findAllStudents,
  findAssignmentsWithDetails,
  findStudentById,
  findSubmissionsForStudents,
  findSubmittedSubmissionsForStudent,
} from '../repository'
import {
  buildAssignmentsWithSubmissions,
  buildStudentWithStats,
} from '../domain/student.domain'
import type {
  StudentDetailWithAssignments,
  StudentWithStats,
} from '@/types/student'
import type { GetStudentDetailInput } from '@/schemas/student.schema'
import type { LogLevel } from '@/utils/observability/logger'
import {
  buildCourseAttendanceScores,
  withAttendanceManageFlags,
} from '@/utils/attendance/domain/attendance-score.domain'
import {
  findAllLessonsForAttendance,
  findPresentsForStudent,
  findPresentsForStudents,
} from '@/utils/attendance/repository/attendance.repository'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import { getUserProfile } from '@/utils/auth/auth'
import { hasStaffPrivilege, resolveAdminOrTeacherAccess } from '@/utils/authz'
import { findCourseAssignmentsForTeachers } from '@/utils/teachers/repository/course-teachers.repository'
import { AuthorizationError, NotFoundError } from '@/utils/errors'
import {
  signAvatarRows,
  signPrivateStoragePath,
} from '@/utils/storage/service/private-storage.service'

async function requireStaffViewer(actorId: string): Promise<void> {
  const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(actorId)
  if (!isAdmin && !isTeacher) throw new AuthorizationError()
}

type StudentDirectoryReadAction = 'getStudents' | 'getStudentDetail'

type StudentDirectoryReadContext = {
  action: StudentDirectoryReadAction
  actorId: string
  targetStudentId?: string
  startedAt: number
}

function logStudentDirectoryEvent(
  level: LogLevel,
  event: string,
  context: StudentDirectoryReadContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    targetStudentId: context.targetStudentId,
    ...fields,
  })
}

async function withStudentDirectoryTelemetry<T>(
  context: StudentDirectoryReadContext,
  read: () => Promise<T>,
  fields: (result: T) => Record<string, unknown>,
): Promise<T> {
  try {
    const result = await read()
    logStudentDirectoryEvent('info', 'student_directory_loaded', context, {
      ...fields(result),
    })
    return result
  } catch (error) {
    logStudentDirectoryEvent(
      'error',
      'student_directory_load_failed',
      context,
      {
        errorCategory: 'student_directory_read_persistence',
      },
    )
    throw error
  }
}

async function loadStudents(): Promise<{ students: Array<StudentWithStats> }> {
  const [allStudents, courses, allAssignments, allLessons] = await Promise.all([
    findAllStudents(),
    findAllCourses(),
    findAllAssignments(),
    findAllLessonsForAttendance(),
  ])

  const signedStudents = await signAvatarRows(allStudents)
  const studentIds = signedStudents.map((s) => s.id)
  const [allSubmissions, allPresents] = await Promise.all([
    findSubmissionsForStudents(studentIds),
    findPresentsForStudents(studentIds),
  ])

  const submissionsByStudent = new Map<string, typeof allSubmissions>()
  for (const s of allSubmissions) {
    const arr = submissionsByStudent.get(s.studentId) ?? []
    arr.push(s)
    submissionsByStudent.set(s.studentId, arr)
  }

  const studentsWithStats: Array<StudentWithStats> = signedStudents.map(
    (student) =>
      buildStudentWithStats(
        student,
        courses,
        submissionsByStudent.get(student.id) ?? [],
        allAssignments.length,
        buildCourseAttendanceScores(
          courses,
          allLessons,
          allPresents,
          student.id,
        ),
      ),
  )

  return { students: studentsWithStats }
}

export async function getStudentsService(actorId: string) {
  await requireStaffViewer(actorId)
  const context: StudentDirectoryReadContext = {
    action: 'getStudents',
    actorId,
    startedAt: performance.now(),
  }
  return withStudentDirectoryTelemetry(context, loadStudents, (result) => ({
    studentCount: result.students.length,
  }))
}

async function resolveManageableCourseIds(
  actorId: string,
  courseIds: Array<string>,
): Promise<Set<string>> {
  if (courseIds.length === 0) return new Set()
  const profile = await getUserProfile(actorId)
  if (profile.role === 'admin') return new Set(courseIds)
  if (profile.role !== 'teacher') return new Set()
  if (await hasStaffPrivilege(actorId, 'attendance_override')) {
    return new Set(courseIds)
  }
  const assignments = await findCourseAssignmentsForTeachers([actorId])
  const managed = new Set(assignments.map((a) => a.courseId))
  return new Set(courseIds.filter((id) => managed.has(id)))
}

async function loadStudentDetail(
  student: NonNullable<Awaited<ReturnType<typeof findStudentById>>>,
  actorId: string,
): Promise<{ student: StudentDetailWithAssignments }> {
  const [enrollments, allAssignments, allLessons, presents] = await Promise.all(
    [
      findAllCoursesDesc(),
      findAssignmentsWithDetails(),
      findAllLessonsForAttendance(),
      findPresentsForStudent(student.id),
    ],
  )

  const assignmentIds = allAssignments.map((a) => a.assignmentId)
  const studentSubmissions = await findSubmittedSubmissionsForStudent(
    student.id,
    assignmentIds,
  )

  const courseRefs = enrollments.map((e) => ({ id: e.id, title: e.title }))
  const scores = buildCourseAttendanceScores(
    courseRefs,
    allLessons,
    presents,
    student.id,
  )
  const manageable = await resolveManageableCourseIds(
    actorId,
    courseRefs.map((c) => c.id),
  )

  const studentDetail: StudentDetailWithAssignments = {
    id: student.id,
    fullName: student.fullName,
    email: student.email,
    bio: student.bio,
    avatarUrl: await signPrivateStoragePath('avatars', student.avatarUrl),
    createdAt: student.createdAt,
    enrollments: enrollments.map((e) => ({
      id: e.id,
      status: 'active',
      courseId: e.id,
      courseTitle: e.title,
    })),
    assignments: buildAssignmentsWithSubmissions(
      allAssignments,
      studentSubmissions,
    ),
    attendanceByCourse: withAttendanceManageFlags(scores, manageable),
  }

  return { student: studentDetail }
}

export async function getStudentDetailService(
  data: GetStudentDetailInput,
  actorId: string,
) {
  await requireStaffViewer(actorId)
  const student = await findStudentById(data.studentId)

  if (!student) {
    throw new NotFoundError('Student not found', {
      details: { studentId: data.studentId },
    })
  }

  const context: StudentDirectoryReadContext = {
    action: 'getStudentDetail',
    actorId,
    targetStudentId: student.id,
    startedAt: performance.now(),
  }
  return withStudentDirectoryTelemetry(
    context,
    () => loadStudentDetail(student, actorId),
    (result) => ({
      assignmentCount: result.student.assignments.length,
      enrollmentCount: result.student.enrollments.length,
    }),
  )
}
