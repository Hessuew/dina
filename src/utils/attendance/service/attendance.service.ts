import type {
  CloseAttendanceInput,
  CourseIdInput,
  MarkPresentInput,
  SetStudentPresentInput,
  StartAttendanceInput,
} from '@/schemas/attendance.schema'
import {
  clearPresentOverrideAtomically,
  closeAttendanceSessionAtomically,
  findLessonInCourse,
  findLessonsWithSessionsByCourseId,
  findOpenSessionOnCourse,
  findOpenSessionsForStudent,
  findPresent,
  markPresentAtomically,
  openAttendanceSessionAtomically,
  setPresentOverrideAtomically,
} from '@/utils/attendance/repository/attendance.repository'
import { assertCanOpenSession } from '@/utils/attendance/domain/attendance-session.domain'
import {
  formatRemaining,
  isAttendanceWindowOpen,
  remainingMs,
} from '@/utils/attendance/domain/attendance-window.domain'
import { getUserProfile } from '@/utils/auth/auth'
import { hasStaffPrivilege } from '@/utils/authz'
import { calculateEntityPermissions } from '@/utils/authz/permissions'
import { findCourseById } from '@/utils/courses/repository'
import { findCourseTeachers } from '@/utils/courses/repository/course-teachers.repository'
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'

type AttendanceCheckInLogContext = {
  courseId: string
  studentId: string
  startedAt: number
}

type AttendanceManagementContext = {
  action: 'startOrReopenAttendance' | 'closeAttendance' | 'setStudentPresent'
  actorId: string
  courseId: string
  lessonId?: string
  targetStudentId?: string
  failureEvent: string
  failureCategory: string
  startedAt: number
}

function logAttendanceCheckInEvent(
  level: 'info' | 'error',
  event: string,
  context: AttendanceCheckInLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: 'serverFn:markPresent',
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    courseId: context.courseId,
    studentId: context.studentId,
    ...fields,
  })
}

function logAttendanceManagementEvent(
  level: 'info' | 'error',
  event: string,
  context: AttendanceManagementContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    courseId: context.courseId,
    lessonId: context.lessonId,
    targetStudentId: context.targetStudentId,
    ...fields,
  })
}

function logAttendanceManagementFailure(
  context: AttendanceManagementContext,
): void {
  logAttendanceManagementEvent('error', context.failureEvent, context, {
    errorCategory: context.failureCategory,
  })
}

async function requireCourseManage(userId: string, courseId: string) {
  const profile = await getUserProfile(userId)
  const course = await findCourseById(courseId)
  if (!course) {
    throw new NotFoundError('Course not found', {
      code: 'COURSE_NOT_FOUND',
      details: { courseId },
    })
  }
  const teachers = await findCourseTeachers(courseId)
  const permissions = calculateEntityPermissions(
    profile.role,
    { teacherIds: teachers.map((t) => t.teacherId) },
    userId,
  )
  if (!permissions.canManage) {
    throw new AuthorizationError(
      'Only course teachers and admins can manage attendance',
    )
  }
  return { profile, course, permissions }
}

async function requireAttendanceOverride(userId: string, courseId: string) {
  try {
    return await requireCourseManage(userId, courseId)
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error
    if (await hasStaffPrivilege(userId, 'attendance_override')) return
    throw error
  }
}

function mapOpenSession(
  session: {
    id: string
    courseId: string
    lessonId: string
    openedAt: Date | null
    closesAt: Date | null
  },
  now: Date,
  extras: {
    lessonTitle?: string
    alreadyPresent?: boolean
  } = {},
) {
  const open = isAttendanceWindowOpen(now, session.closesAt)
  return {
    id: session.id,
    courseId: session.courseId,
    lessonId: session.lessonId,
    lessonTitle: extras.lessonTitle ?? null,
    openedAt: session.openedAt,
    closesAt: session.closesAt,
    isOpen: open,
    remainingMs:
      open && session.closesAt ? remainingMs(now, session.closesAt) : 0,
    remainingLabel:
      open && session.closesAt
        ? formatRemaining(remainingMs(now, session.closesAt))
        : null,
    alreadyPresent: extras.alreadyPresent ?? false,
  }
}

async function mapLessonsWithSessions(courseId: string, now: Date) {
  const lessons = await findLessonsWithSessionsByCourseId(courseId)
  return lessons.map((lesson) => ({
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    orderIndex: lesson.orderIndex,
    hasSession: lesson.sessionId !== null,
    isOpen: isAttendanceWindowOpen(now, lesson.closesAt),
  }))
}

export async function getCourseAttendanceStateService(
  data: CourseIdInput,
  userId: string,
) {
  const profile = await getUserProfile(userId)
  const now = new Date()
  const [openSession, lessons] = await Promise.all([
    findOpenSessionOnCourse(data.courseId, now),
    mapLessonsWithSessions(data.courseId, now),
  ])

  let alreadyPresent = false
  let lessonTitle: string | undefined
  if (openSession) {
    lessonTitle =
      lessons.find((l) => l.lessonId === openSession.lessonId)?.lessonTitle ??
      undefined
    if (profile.role === 'student') {
      const present = await findPresent(openSession.id, userId)
      alreadyPresent = present !== null
    }
  }

  return {
    role: profile.role,
    serverNow: now,
    openSession: openSession
      ? mapOpenSession(openSession, now, { lessonTitle, alreadyPresent })
      : null,
    lessons,
  }
}

export async function startOrReopenAttendanceService(
  data: StartAttendanceInput,
  userId: string,
) {
  await requireCourseManage(userId, data.courseId)
  const lesson = await findLessonInCourse(data.lessonId, data.courseId)
  if (!lesson) {
    throw new NotFoundError('Lesson not found on this course', {
      code: 'LESSON_NOT_FOUND',
      details: { lessonId: data.lessonId, courseId: data.courseId },
    })
  }

  const context: AttendanceManagementContext = {
    action: 'startOrReopenAttendance',
    actorId: userId,
    courseId: data.courseId,
    lessonId: data.lessonId,
    failureEvent: 'attendance_session_open_failed',
    failureCategory: 'attendance_session_open_persistence',
    startedAt: performance.now(),
  }
  let result: Awaited<ReturnType<typeof openAttendanceSessionAtomically>>
  try {
    result = await openAttendanceSessionAtomically({
      courseId: data.courseId,
      lessonId: data.lessonId,
      openedBy: userId,
    })
  } catch (error) {
    logAttendanceManagementFailure(context)
    throw error
  }
  const now = new Date()
  if (result.kind === 'conflict') {
    assertCanOpenSession({
      now,
      courseId: data.courseId,
      lessonId: data.lessonId,
      openOnCourse: result.open,
    })
    throw new ConflictError('Attendance session changed; try again')
  }
  logAttendanceManagementEvent('info', 'attendance_session_opened', context, {
    sessionId: result.session.id,
    attendanceStatus: 'open',
  })
  return {
    session: mapOpenSession(result.session, now, { lessonTitle: lesson.title }),
  }
}

export async function closeAttendanceService(
  data: CloseAttendanceInput,
  userId: string,
) {
  await requireCourseManage(userId, data.courseId)
  const context: AttendanceManagementContext = {
    action: 'closeAttendance',
    actorId: userId,
    courseId: data.courseId,
    failureEvent: 'attendance_session_close_failed',
    failureCategory: 'attendance_session_close_persistence',
    startedAt: performance.now(),
  }
  let closed: Awaited<ReturnType<typeof closeAttendanceSessionAtomically>>
  try {
    closed = await closeAttendanceSessionAtomically(data.courseId)
  } catch (error) {
    logAttendanceManagementFailure(context)
    throw error
  }
  if (!closed) {
    throw new ConflictError('No open attendance window on this course')
  }
  logAttendanceManagementEvent('info', 'attendance_session_closed', context, {
    sessionId: closed.id,
    attendanceStatus: 'closed',
  })
  return { session: mapOpenSession(closed, new Date()) }
}

async function setPresentOverride(
  data: SetStudentPresentInput,
  actorId: string,
  context: AttendanceManagementContext,
) {
  try {
    const result = await setPresentOverrideAtomically({
      courseId: data.courseId,
      lessonId: data.lessonId,
      studentId: data.studentId,
      openedBy: actorId,
    })
    logAttendanceManagementEvent(
      'info',
      'attendance_override_updated',
      context,
      {
        attendanceStatus: 'present',
        present: true,
        created: result.created,
        sessionId: result.session.id,
      },
    )
    return {
      present: true as const,
      created: result.created,
      cleared: false as const,
      checkedInAt: result.present.checkedInAt,
      sessionId: result.session.id,
      lessonId: result.session.lessonId,
    }
  } catch (error) {
    logAttendanceManagementFailure(context)
    throw error
  }
}

async function clearPresentOverride(
  data: SetStudentPresentInput,
  context: AttendanceManagementContext,
) {
  try {
    const cleared = await clearPresentOverrideAtomically({
      courseId: data.courseId,
      lessonId: data.lessonId,
      studentId: data.studentId,
    })
    logAttendanceManagementEvent(
      'info',
      'attendance_override_updated',
      context,
      {
        attendanceStatus: 'absent',
        present: false,
        cleared: cleared.cleared,
        sessionId: cleared.session?.id ?? null,
      },
    )
    return {
      present: false as const,
      created: false as const,
      cleared: cleared.cleared,
      checkedInAt: null,
      sessionId: cleared.session?.id ?? null,
      lessonId: data.lessonId,
    }
  } catch (error) {
    logAttendanceManagementFailure(context)
    throw error
  }
}

export async function markPresentService(
  data: MarkPresentInput,
  userId: string,
) {
  const context: AttendanceCheckInLogContext = {
    courseId: data.courseId,
    studentId: userId,
    startedAt: performance.now(),
  }
  const profile = await getUserProfile(userId)
  if (profile.role !== 'student') {
    throw new AuthorizationError('Only students can mark attendance')
  }

  let result: Awaited<ReturnType<typeof markPresentAtomically>>
  try {
    result = await markPresentAtomically({
      courseId: data.courseId,
      studentId: userId,
    })
  } catch (error) {
    logAttendanceCheckInEvent('error', 'attendance_check_in_failed', context, {
      errorCategory: 'attendance_check_in',
    })
    throw error
  }
  if (!result) {
    throw new ValidationError('Attendance window is closed')
  }

  logAttendanceCheckInEvent(
    'info',
    result.created
      ? 'attendance_check_in_completed'
      : 'attendance_check_in_ignored',
    context,
    {
      status: result.created ? 'checked_in' : 'already_present',
      sessionId: result.session.id,
      lessonId: result.session.lessonId,
    },
  )

  return {
    present: true,
    created: result.created,
    checkedInAt: result.present.checkedInAt,
    sessionId: result.session.id,
    lessonId: result.session.lessonId,
  }
}

export async function listOpenAttendanceForStudentService(userId: string) {
  const profile = await getUserProfile(userId)
  if (profile.role !== 'student') {
    return {
      sessions: [] as Array<
        ReturnType<typeof mapOpenSession> & { courseTitle: string }
      >,
    }
  }

  const now = new Date()
  const open = await findOpenSessionsForStudent(now, userId)
  const sessions = open.map((row) => ({
    ...mapOpenSession(row, now, {
      lessonTitle: row.lessonTitle,
      alreadyPresent: row.presentId !== null,
    }),
    courseTitle: row.courseTitle,
  }))
  return { sessions, serverNow: now }
}

export async function setStudentPresentService(
  data: SetStudentPresentInput,
  actorId: string,
) {
  await requireAttendanceOverride(actorId, data.courseId)

  const target = await getUserProfile(data.studentId)
  if (target.role !== 'student') {
    throw new ValidationError('Target must be a student', {
      code: 'TARGET_NOT_STUDENT',
      details: { studentId: data.studentId },
    })
  }

  const lesson = await findLessonInCourse(data.lessonId, data.courseId)
  if (!lesson) {
    throw new NotFoundError('Lesson not found on this course', {
      code: 'LESSON_NOT_FOUND',
      details: { lessonId: data.lessonId, courseId: data.courseId },
    })
  }

  const context: AttendanceManagementContext = {
    action: 'setStudentPresent',
    actorId,
    courseId: data.courseId,
    lessonId: data.lessonId,
    targetStudentId: data.studentId,
    failureEvent: 'attendance_override_failed',
    failureCategory: 'attendance_override_persistence',
    startedAt: performance.now(),
  }
  return data.present
    ? setPresentOverride(data, actorId, context)
    : clearPresentOverride(data, context)
}
