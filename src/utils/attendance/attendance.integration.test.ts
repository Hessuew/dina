import { describe, expect, it } from 'vitest'
import {
  seedCourse,
  seedCourseTeacher,
  seedLesson,
  seedProfile,
} from '@/../test/integration/seed'
import {
  closeAttendanceService,
  getCourseAttendanceStateService,
  markPresentService,
  startOrReopenAttendanceService,
} from '@/utils/attendance/service/attendance.service'
import {
  AuthorizationError,
  ConflictError,
  ValidationError,
} from '@/utils/errors'

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

describe('attendance mark present (integration)', () => {
  it('student marks present once; second press is idempotent', async () => {
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
})
