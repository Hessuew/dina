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
import { calculateEntityPermissions } from '@/utils/authz/permissions'
import { findCourseById } from '@/utils/courses/repository'
import { findCourseTeachers } from '@/utils/courses/repository/course-teachers.repository'
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'

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

  const result = await openAttendanceSessionAtomically({
    courseId: data.courseId,
    lessonId: data.lessonId,
    openedBy: userId,
  })
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
  return {
    session: mapOpenSession(result.session, now, { lessonTitle: lesson.title }),
  }
}

export async function closeAttendanceService(
  data: CloseAttendanceInput,
  userId: string,
) {
  await requireCourseManage(userId, data.courseId)
  const closed = await closeAttendanceSessionAtomically(data.courseId)
  if (!closed) {
    throw new ConflictError('No open attendance window on this course')
  }
  return { session: mapOpenSession(closed, new Date()) }
}

export async function markPresentService(
  data: MarkPresentInput,
  userId: string,
) {
  const profile = await getUserProfile(userId)
  if (profile.role !== 'student') {
    throw new AuthorizationError('Only students can mark attendance')
  }

  const result = await markPresentAtomically({
    courseId: data.courseId,
    studentId: userId,
  })
  if (!result) {
    throw new ValidationError('Attendance window is closed')
  }

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
  await requireCourseManage(actorId, data.courseId)

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

  if (data.present) {
    const result = await setPresentOverrideAtomically({
      courseId: data.courseId,
      lessonId: data.lessonId,
      studentId: data.studentId,
      openedBy: actorId,
    })
    return {
      present: true as const,
      created: result.created,
      cleared: false as const,
      checkedInAt: result.present.checkedInAt,
      sessionId: result.session.id,
      lessonId: result.session.lessonId,
    }
  }

  const cleared = await clearPresentOverrideAtomically({
    courseId: data.courseId,
    lessonId: data.lessonId,
    studentId: data.studentId,
  })
  return {
    present: false as const,
    created: false as const,
    cleared: cleared.cleared,
    checkedInAt: null,
    sessionId: cleared.session?.id ?? null,
    lessonId: data.lessonId,
  }
}
