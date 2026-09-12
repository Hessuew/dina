import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  seedAssignment,
  seedCourse,
  seedLesson,
  seedProfile,
  seedSubmission,
} from '@/../test/integration/seed'
import {
  getStudentDetailService,
  getStudentsService,
} from '@/utils/student/service/student.service'
import { setStaffPrivilegeService } from '@/utils/staff-privilege/service/staff-privilege.service'
import { AuthorizationError, NotFoundError } from '@/utils/errors'
import { withObservabilityRequest } from '@/utils/observability/request-context'
import * as studentRepository from '@/utils/student/repository'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getStudentsService (integration)', () => {
  it('returns only role=student profiles, ordered by fullName', async () => {
    await seedProfile({ role: 'admin', fullName: 'Admin Adams' })
    const teacherId = await seedProfile({
      role: 'teacher',
      fullName: 'Tina Teacher',
    })
    await seedProfile({ role: 'student', fullName: 'Bob' })
    await seedProfile({ role: 'student', fullName: 'Alice' })

    const { students } = await getStudentsService(teacherId)

    expect(students.map((s) => s.fullName)).toEqual(['Alice', 'Bob'])
  })

  it('builds assignment stats from real submissions', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student', fullName: 'Sara' })
    const courseId = await seedCourse({ title: 'Foundations' })
    const lessonId = await seedLesson({ courseId })
    const a1 = await seedAssignment({ lessonId })
    const a2 = await seedAssignment({ lessonId })
    // graded + submitted → counts toward submitted + average
    await seedSubmission({
      assignmentId: a1,
      studentId,
      status: 'submitted',
      grade: 80,
    })
    // draft → excluded from submittedAssignments and (null grade) from average
    await seedSubmission({ assignmentId: a2, studentId, status: 'draft' })

    const { students } = await getStudentsService(teacherId)

    expect(students).toHaveLength(1)
    const stats = students[0].assignmentStats
    expect(stats.totalAssignments).toBe(2)
    expect(stats.submittedAssignments).toBe(1)
    expect(stats.averageGradeByCourse).toEqual([
      { courseId, courseTitle: 'Foundations', averageGrade: 80, maxGrade: 100 },
    ])
    // NOTE: current behavior — enrollmentCount is the total course count, not
    // the student's actual courses (placeholder; see plan "out of scope").
    expect(students[0].enrollmentCount).toBe(1)
  })

  it('returns an empty list when there are no students', async () => {
    const adminId = await seedProfile({ role: 'admin' })

    const { students } = await getStudentsService(adminId)

    expect(students).toEqual([])
  })

  it('rejects direct student calls before reading the directory', async () => {
    const studentId = await seedProfile({ role: 'student' })

    await expect(getStudentsService(studentId)).rejects.toBeInstanceOf(
      AuthorizationError,
    )
  })

  it('logs redacted list and detail outcomes with safe metadata', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const actorId = await seedProfile({ role: 'admin' })
    const studentId = await seedProfile({
      role: 'student',
      fullName: 'Private Student',
      email: 'private.student@test.dev',
    })

    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'student-directory-request' },
      }),
      () => getStudentsService(actorId),
    )
    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'student-detail-request' },
      }),
      () => getStudentDetailService({ studentId }, actorId),
    )

    const lines = infoSpy.mock.calls.map(([line]) => String(line))
    const events = lines.map((line) => JSON.parse(line))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'student_directory_loaded',
          path: 'serverFn:getStudents',
          requestId: 'student-directory-request',
          actorId,
          studentCount: 1,
        }),
        expect.objectContaining({
          event: 'student_directory_loaded',
          path: 'serverFn:getStudentDetail',
          requestId: 'student-detail-request',
          actorId,
          targetStudentId: studentId,
          assignmentCount: 0,
          enrollmentCount: 0,
        }),
      ]),
    )
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
    expect(lines.join('\n')).not.toContain('Private Student')
    expect(lines.join('\n')).not.toContain('private.student@test.dev')
  })

  it('logs stable failure metadata and preserves the repository error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const actorId = await seedProfile({ role: 'admin' })
    const repositoryError = new Error(
      'connectionString=secret; email=private.student@test.dev',
    )
    vi.spyOn(studentRepository, 'findAllStudents').mockRejectedValueOnce(
      repositoryError,
    )

    await expect(getStudentsService(actorId)).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('connectionString')
    expect(line).not.toContain('private.student@test.dev')
    expect(JSON.parse(line)).toMatchObject({
      event: 'student_directory_load_failed',
      path: 'serverFn:getStudents',
      actorId,
      status: 'failure',
      errorCategory: 'student_directory_read_persistence',
      durationMs: expect.any(Number),
    })
  })
})

describe('getStudentDetailService (integration)', () => {
  it('rejects direct student calls before reading another student', async () => {
    const actorId = await seedProfile({ role: 'student' })

    await expect(
      getStudentDetailService({ studentId: actorId }, actorId),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })

  it('throws NotFoundError for an unknown id', async () => {
    const viewerId = await seedProfile({ role: 'admin' })
    await expect(
      getStudentDetailService(
        {
          studentId: '00000000-0000-0000-0000-000000000000',
        },
        viewerId,
      ),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('throws NotFoundError when the id belongs to a non-student profile', async () => {
    const adminId = await seedProfile({ role: 'admin' })

    await expect(
      getStudentDetailService({ studentId: adminId }, adminId),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('returns identity fields and only assignments with a submitted submission', async () => {
    const viewerId = await seedProfile({ role: 'admin' })
    const studentId = await seedProfile({
      role: 'student',
      fullName: 'Sara Student',
      email: 'sara@test.dev',
    })
    const courseId = await seedCourse({ title: 'Foundations' })
    const lessonId = await seedLesson({ courseId })
    const submittedAssignment = await seedAssignment({
      lessonId,
      title: 'Essay',
    })
    const draftAssignment = await seedAssignment({ lessonId, title: 'Quiz' })
    await seedSubmission({
      assignmentId: submittedAssignment,
      studentId,
      status: 'submitted',
      grade: 90,
    })
    await seedSubmission({
      assignmentId: draftAssignment,
      studentId,
      status: 'draft',
    })

    const { student } = await getStudentDetailService({ studentId }, viewerId)

    expect(student).toMatchObject({
      id: studentId,
      fullName: 'Sara Student',
      email: 'sara@test.dev',
      bio: null,
      avatarUrl: null,
    })
    // only the submitted-submission assignment surfaces
    expect(student.assignments.map((a) => a.title)).toEqual(['Essay'])
    expect(student.assignments[0].submission?.grade).toBe(90)
    // NOTE: current behavior — enrollments mirror all courses with a hardcoded
    // 'active' status and courseId = course id (placeholder; see plan).
    expect(student.enrollments).toEqual([
      { id: courseId, status: 'active', courseId, courseTitle: 'Foundations' },
    ])
    expect(
      student.attendanceByCourse.find((s) => s.courseId === courseId)
        ?.canManageAttendance,
    ).toBe(true)
  })

  it('flags every course as manageable for a privileged outsider teacher', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const outsiderId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const courseId = await seedCourse({ title: 'Foundations' })
    await seedLesson({ courseId })
    await setStaffPrivilegeService(adminId, {
      userId: outsiderId,
      privilege: 'attendance_override',
      granted: true,
    })

    const { student } = await getStudentDetailService({ studentId }, outsiderId)
    expect(
      student.attendanceByCourse.find((score) => score.courseId === courseId)
        ?.canManageAttendance,
    ).toBe(true)
  })
})
