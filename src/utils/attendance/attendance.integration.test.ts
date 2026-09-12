import { afterEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import {
  seedCourse,
  seedCourseTeacher,
  seedLesson,
  seedProfile,
} from '@/../test/integration/seed'
import {
  closeAttendanceService,
  getCourseAttendanceStateService,
  listOpenAttendanceForStudentService,
  markPresentService,
  setStudentPresentService,
  startOrReopenAttendanceService,
} from '@/utils/attendance/service/attendance.service'
import { findPresentsForStudent } from '@/utils/attendance/repository/attendance.repository'
import { getDb } from '@/db'
import { attendanceSessions } from '@/db/schema'
import { setStaffPrivilegeService } from '@/utils/staff-privilege/service/staff-privilege.service'
import { withObservabilityRequest } from '@/utils/observability/request-context'
import * as attendanceRepository from '@/utils/attendance/repository/attendance.repository'
import {
  AuthorizationError,
  ConflictError,
  ValidationError,
} from '@/utils/errors'

afterEach(() => {
  vi.restoreAllMocks()
})

async function seedManagedCourse() {
  const teacherId = await seedProfile({ role: 'teacher' })
  const outsiderId = await seedProfile({ role: 'teacher' })
  const studentId = await seedProfile({ role: 'student' })
  const adminId = await seedProfile({ role: 'admin' })
  const courseId = await seedCourse({ title: 'Romans' })
  await seedCourseTeacher(courseId, teacherId)
  const lesson1 = await seedLesson({
    courseId,
    title: 'Lesson 1',
    isPublished: true,
  })
  const lesson2 = await seedLesson({
    courseId,
    title: 'Lesson 2',
    isPublished: true,
  })
  return {
    teacherId,
    outsiderId,
    studentId,
    adminId,
    courseId,
    lesson1,
    lesson2,
  }
}

describe('attendance open / re-open / close (integration)', () => {
  it('course teacher opens a 10-minute window for a lesson', async () => {
    const { teacherId, courseId, lesson1 } = await seedManagedCourse()
    const { session } = await startOrReopenAttendanceService(
      { courseId, lessonId: lesson1 },
      teacherId,
    )
    expect(session.isOpen).toBe(true)
    expect(session.lessonId).toBe(lesson1)
    expect(session.remainingMs).toBeGreaterThan(9 * 60_000)
    expect(session.remainingMs).toBeLessThanOrEqual(10 * 60_000)
  })

  it('rejects outsider teacher open', async () => {
    const { outsiderId, courseId, lesson1 } = await seedManagedCourse()
    await expect(
      startOrReopenAttendanceService(
        { courseId, lessonId: lesson1 },
        outsiderId,
      ),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })

  it('allows admin to open without course teacher membership', async () => {
    const { adminId, courseId, lesson1 } = await seedManagedCourse()
    const { session } = await startOrReopenAttendanceService(
      { courseId, lessonId: lesson1 },
      adminId,
    )
    expect(session.isOpen).toBe(true)
  })

  it('blocks second open for a different lesson on same course', async () => {
    const { teacherId, courseId, lesson1, lesson2 } = await seedManagedCourse()
    await startOrReopenAttendanceService(
      { courseId, lessonId: lesson1 },
      teacherId,
    )
    await expect(
      startOrReopenAttendanceService(
        { courseId, lessonId: lesson2 },
        teacherId,
      ),
    ).rejects.toBeInstanceOf(ConflictError)
  })

  it('serializes concurrent opens for different lessons', async () => {
    const { teacherId, courseId, lesson1, lesson2 } = await seedManagedCourse()
    const results = await Promise.allSettled([
      startOrReopenAttendanceService(
        { courseId, lessonId: lesson1 },
        teacherId,
      ),
      startOrReopenAttendanceService(
        { courseId, lessonId: lesson2 },
        teacherId,
      ),
    ])
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1)
    const rejected = results.find((result) => result.status === 'rejected')
    expect(rejected).toMatchObject({ reason: expect.any(ConflictError) })
  })

  it('manual close then re-open same lesson keeps presents and allows new check-in', async () => {
    const { teacherId, studentId, courseId, lesson1 } =
      await seedManagedCourse()
    await startOrReopenAttendanceService(
      { courseId, lessonId: lesson1 },
      teacherId,
    )
    const first = await markPresentService({ courseId }, studentId)
    expect(first.created).toBe(true)

    await closeAttendanceService({ courseId }, teacherId)
    await expect(
      markPresentService({ courseId }, studentId),
    ).rejects.toBeInstanceOf(ValidationError)

    await startOrReopenAttendanceService(
      { courseId, lessonId: lesson1 },
      teacherId,
    )
    const second = await markPresentService({ courseId }, studentId)
    expect(second.created).toBe(false)
    expect(second.checkedInAt).toEqual(first.checkedInAt)
  })
})

describe('attendance management telemetry (integration)', () => {
  it('logs redacted session and override outcomes with safe metadata', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { teacherId, studentId, courseId, lesson1 } =
      await seedManagedCourse()

    const opened = await startOrReopenAttendanceService(
      { courseId, lessonId: lesson1 },
      teacherId,
    )
    await closeAttendanceService({ courseId }, teacherId)
    await setStudentPresentService(
      { studentId, courseId, lessonId: lesson1, present: true },
      teacherId,
    )
    await setStudentPresentService(
      { studentId, courseId, lessonId: lesson1, present: false },
      teacherId,
    )

    const events = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .filter((entry) =>
        [
          'attendance_session_opened',
          'attendance_session_closed',
          'attendance_override_updated',
        ].includes(String(entry.event)),
      )

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'attendance_session_opened',
          path: 'serverFn:startOrReopenAttendance',
          actorId: teacherId,
          courseId,
          lessonId: lesson1,
          sessionId: opened.session.id,
          attendanceStatus: 'open',
        }),
        expect.objectContaining({
          event: 'attendance_session_closed',
          path: 'serverFn:closeAttendance',
          actorId: teacherId,
          courseId,
          sessionId: opened.session.id,
          attendanceStatus: 'closed',
        }),
        expect.objectContaining({
          event: 'attendance_override_updated',
          path: 'serverFn:setStudentPresent',
          actorId: teacherId,
          targetStudentId: studentId,
          attendanceStatus: 'present',
          present: true,
        }),
        expect.objectContaining({
          event: 'attendance_override_updated',
          path: 'serverFn:setStudentPresent',
          actorId: teacherId,
          targetStudentId: studentId,
          attendanceStatus: 'absent',
          present: false,
        }),
      ]),
    )
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
    infoSpy.mockRestore()
  })
})

describe('attendance mark present (integration)', () => {
  it('student marks present once; second press is idempotent', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { teacherId, studentId, courseId, lesson1 } =
      await seedManagedCourse()
    await startOrReopenAttendanceService(
      { courseId, lessonId: lesson1 },
      teacherId,
    )
    const a = await markPresentService({ courseId }, studentId)
    const b = await markPresentService({ courseId }, studentId)
    expect(a.created).toBe(true)
    expect(b.created).toBe(false)
    expect(b.checkedInAt).toEqual(a.checkedInAt)

    const events = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .filter((entry) =>
        [
          'attendance_check_in_completed',
          'attendance_check_in_ignored',
        ].includes(String(entry.event)),
      )
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'attendance_check_in_completed',
          path: 'serverFn:markPresent',
          status: 'checked_in',
          courseId,
          studentId,
          sessionId: a.sessionId,
          lessonId: lesson1,
        }),
        expect.objectContaining({
          event: 'attendance_check_in_ignored',
          path: 'serverFn:markPresent',
          status: 'already_present',
          courseId,
          studentId,
          sessionId: b.sessionId,
          lessonId: lesson1,
        }),
      ]),
    )
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
    infoSpy.mockRestore()
  })

  it('teacher cannot mark present', async () => {
    const { teacherId, courseId, lesson1 } = await seedManagedCourse()
    await startOrReopenAttendanceService(
      { courseId, lessonId: lesson1 },
      teacherId,
    )
    await expect(
      markPresentService({ courseId }, teacherId),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })

  it('rejects mark when no window open', async () => {
    const { studentId, courseId } = await seedManagedCourse()
    await expect(
      markPresentService({ courseId }, studentId),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('course state reports alreadyPresent for the student', async () => {
    const { teacherId, studentId, courseId, lesson1 } =
      await seedManagedCourse()
    await startOrReopenAttendanceService(
      { courseId, lessonId: lesson1 },
      teacherId,
    )
    await markPresentService({ courseId }, studentId)
    const state = await getCourseAttendanceStateService({ courseId }, studentId)
    expect(state.openSession?.alreadyPresent).toBe(true)
  })

  it('hides unpublished lessons and their sessions from non-managers', async () => {
    const { teacherId, outsiderId, studentId, courseId, lesson1, lesson2 } =
      await seedManagedCourse()
    const draftLesson = await seedLesson({
      courseId,
      title: 'Draft lesson',
      isPublished: false,
    })
    await startOrReopenAttendanceService(
      { courseId, lessonId: draftLesson },
      teacherId,
    )

    const studentState = await getCourseAttendanceStateService(
      { courseId },
      studentId,
    )
    expect(studentState.lessons.map((l) => l.lessonId)).toEqual([
      lesson1,
      lesson2,
    ])
    expect(studentState.openSession).toBeNull()

    const outsiderState = await getCourseAttendanceStateService(
      { courseId },
      outsiderId,
    )
    expect(outsiderState.lessons.map((l) => l.lessonId)).toEqual([
      lesson1,
      lesson2,
    ])
    expect(outsiderState.openSession).toBeNull()

    const teacherState = await getCourseAttendanceStateService(
      { courseId },
      teacherId,
    )
    expect(teacherState.lessons).toHaveLength(3)
    expect(teacherState.openSession?.lessonId).toBe(draftLesson)
  })
})

describe('attendance read telemetry (integration)', () => {
  it('stays silent on successful polled reads', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { teacherId, studentId, courseId, lesson1 } =
      await seedManagedCourse()
    await startOrReopenAttendanceService(
      { courseId, lessonId: lesson1 },
      teacherId,
    )
    infoSpy.mockClear()

    await withObservabilityRequest(
      new Request('https://christ-dina.org/attendance/state', {
        headers: { 'x-request-id': 'attendance-state-read' },
      }),
      () => getCourseAttendanceStateService({ courseId }, studentId),
    )
    await withObservabilityRequest(
      new Request('https://christ-dina.org/attendance/open', {
        headers: { 'x-request-id': 'attendance-open-read' },
      }),
      () => listOpenAttendanceForStudentService(studentId),
    )

    const events = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .filter((event) => String(event.event).startsWith('attendance_'))
    expect(events).toEqual([])
  })

  it('logs stable persistence categories without raw read errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { studentId } = await seedManagedCourse()
    const repositoryError = new Error('attendance database secret')
    vi.spyOn(
      attendanceRepository,
      'findOpenSessionsForStudent',
    ).mockRejectedValueOnce(repositoryError)

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/attendance/open', {
          headers: { 'x-request-id': 'attendance-open-failure' },
        }),
        () => listOpenAttendanceForStudentService(studentId),
      ),
    ).rejects.toBe(repositoryError)

    const serialized = String(errorSpy.mock.calls[0]?.[0])
    expect(JSON.parse(serialized)).toMatchObject({
      event: 'attendance_open_sessions_load_failed',
      path: 'serverFn:listOpenAttendanceForStudent',
      requestId: 'attendance-open-failure',
      actorId: studentId,
      errorCategory: 'attendance_read_persistence',
      status: 'failure',
      durationMs: expect.any(Number),
    })
    expect(serialized).not.toContain('attendance database secret')
  })
})

describe('setStudentPresentService override (integration)', () => {
  it('course teacher marks present without prior session (closed session)', async () => {
    const { teacherId, studentId, courseId, lesson1 } =
      await seedManagedCourse()
    const result = await setStudentPresentService(
      {
        studentId,
        courseId,
        lessonId: lesson1,
        present: true,
      },
      teacherId,
    )
    expect(result.present).toBe(true)
    expect(result.created).toBe(true)

    const presents = await findPresentsForStudent(studentId)
    expect(presents.some((p) => p.lessonId === lesson1)).toBe(true)

    const db = await getDb()
    const [session] = await db
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.lessonId, lesson1))
      .limit(1)
    expect(session).toBeTruthy()
    expect(session.openedAt?.getTime()).toBe(session.closesAt?.getTime())
    expect(session.openedBy).toBe(teacherId)
  })

  it('clears present on override unmark', async () => {
    const { teacherId, studentId, courseId, lesson1 } =
      await seedManagedCourse()
    await setStudentPresentService(
      { studentId, courseId, lessonId: lesson1, present: true },
      teacherId,
    )
    const cleared = await setStudentPresentService(
      { studentId, courseId, lessonId: lesson1, present: false },
      teacherId,
    )
    expect(cleared.present).toBe(false)
    expect(cleared.cleared).toBe(true)
    const presents = await findPresentsForStudent(studentId)
    expect(presents.some((p) => p.lessonId === lesson1)).toBe(false)
  })

  it('admin can override; outsider teacher cannot', async () => {
    const { outsiderId, adminId, studentId, courseId, lesson1 } =
      await seedManagedCourse()
    await expect(
      setStudentPresentService(
        { studentId, courseId, lessonId: lesson1, present: true },
        outsiderId,
      ),
    ).rejects.toBeInstanceOf(AuthorizationError)

    const result = await setStudentPresentService(
      { studentId, courseId, lessonId: lesson1, present: true },
      adminId,
    )
    expect(result.present).toBe(true)
  })

  it('privileged outsider can override but cannot open a live window', async () => {
    const { outsiderId, adminId, studentId, courseId, lesson1 } =
      await seedManagedCourse()
    await setStaffPrivilegeService(adminId, {
      userId: outsiderId,
      privilege: 'attendance_override',
      granted: true,
    })

    const result = await setStudentPresentService(
      { studentId, courseId, lessonId: lesson1, present: true },
      outsiderId,
    )
    expect(result.present).toBe(true)

    await expect(
      startOrReopenAttendanceService(
        { courseId, lessonId: lesson1 },
        outsiderId,
      ),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })

  it('rejects non-student target and student actor', async () => {
    const { teacherId, studentId, courseId, lesson1 } =
      await seedManagedCourse()
    await expect(
      setStudentPresentService(
        {
          studentId: teacherId,
          courseId,
          lessonId: lesson1,
          present: true,
        },
        teacherId,
      ),
    ).rejects.toBeInstanceOf(ValidationError)

    await expect(
      setStudentPresentService(
        { studentId, courseId, lessonId: lesson1, present: true },
        studentId,
      ),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })

  it('does not rewrite timestamps on existing open session', async () => {
    const { teacherId, studentId, courseId, lesson1 } =
      await seedManagedCourse()
    const { session: open } = await startOrReopenAttendanceService(
      { courseId, lessonId: lesson1 },
      teacherId,
    )
    const openedAt = open.openedAt
    const closesAt = open.closesAt

    await setStudentPresentService(
      { studentId, courseId, lessonId: lesson1, present: true },
      teacherId,
    )

    const db = await getDb()
    const [session] = await db
      .select()
      .from(attendanceSessions)
      .where(eq(attendanceSessions.lessonId, lesson1))
      .limit(1)
    expect(session.openedAt?.getTime()).toBe(
      openedAt instanceof Date
        ? openedAt.getTime()
        : new Date(openedAt!).getTime(),
    )
    expect(session.closesAt?.getTime()).toBe(
      closesAt instanceof Date
        ? closesAt.getTime()
        : new Date(closesAt!).getTime(),
    )

    const state = await getCourseAttendanceStateService({ courseId }, studentId)
    expect(state.openSession?.isOpen).toBe(true)
    expect(state.openSession?.alreadyPresent).toBe(true)
  })

  it('idempotent set present true twice', async () => {
    const { teacherId, studentId, courseId, lesson1 } =
      await seedManagedCourse()
    const a = await setStudentPresentService(
      { studentId, courseId, lessonId: lesson1, present: true },
      teacherId,
    )
    const b = await setStudentPresentService(
      { studentId, courseId, lessonId: lesson1, present: true },
      teacherId,
    )
    expect(a.created).toBe(true)
    expect(b.created).toBe(false)
    expect(b.checkedInAt).toEqual(a.checkedInAt)
  })
})
