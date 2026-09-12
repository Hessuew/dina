import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  seedDiscipleshipAssignment,
  seedDiscipleshipGroup,
  seedDiscipleshipPair,
  seedProfile,
} from '@/../test/integration/seed'
import {
  assignStudentToTeacherService,
  getDiscipleshipBoardService,
  getStudentDiscipleshipViewService,
  pairStudentsService,
  setIndividualScheduleService,
} from '@/utils/discipleship/service/discipleship.service'
import { AuthorizationError } from '@/utils/errors'
import * as discipleshipRepository from '@/utils/discipleship/repository'
import { withObservabilityRequest } from '@/utils/observability/request-context'

describe('getStudentDiscipleshipViewService (integration)', () => {
  it('returns unassigned for a student with no assignment', async () => {
    const studentId = await seedProfile({ role: 'student', fullName: 'Solo' })

    const view = await getStudentDiscipleshipViewService(studentId)

    expect(view).toEqual({ kind: 'unassigned' })
  })

  it('rejects non-students', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })

    await expect(
      getStudentDiscipleshipViewService(teacherId),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })

  it('returns assigned view without classmate emails or foreign times', async () => {
    const teacherId = await seedProfile({
      role: 'teacher',
      fullName: 'Teacher T',
      email: 'teacher@test.dev',
    })
    const otherTeacherId = await seedProfile({
      role: 'teacher',
      fullName: 'Other Teacher',
    })
    const viewerId = await seedProfile({
      role: 'student',
      fullName: 'Viewer V',
      email: 'viewer@secret.dev',
    })
    const partnerId = await seedProfile({
      role: 'student',
      fullName: 'Partner P',
      email: 'partner@secret.dev',
    })
    const classmateId = await seedProfile({
      role: 'student',
      fullName: 'Classmate C',
      email: 'class@secret.dev',
    })
    const outsiderId = await seedProfile({
      role: 'student',
      fullName: 'Outsider O',
      email: 'out@secret.dev',
    })

    const pairId = await seedDiscipleshipPair({
      teacherId,
      anchorAt: new Date('2026-08-01T09:00:00.000Z'),
    })
    const otherPairId = await seedDiscipleshipPair({
      teacherId,
      anchorAt: new Date('2099-01-01T00:00:00.000Z'),
    })
    await seedDiscipleshipGroup({
      teacherId,
      anchorAt: new Date('2026-08-15T12:00:00.000Z'),
    })

    await seedDiscipleshipAssignment({
      studentId: viewerId,
      teacherId,
      pairId,
      anchorAt: new Date('2026-07-20T10:00:00.000Z'),
    })
    await seedDiscipleshipAssignment({
      studentId: partnerId,
      teacherId,
      pairId,
      anchorAt: new Date('2099-06-01T00:00:00.000Z'),
    })
    await seedDiscipleshipAssignment({
      studentId: classmateId,
      teacherId,
      pairId: otherPairId,
      anchorAt: new Date('2099-07-01T00:00:00.000Z'),
    })
    await seedDiscipleshipAssignment({
      studentId: outsiderId,
      teacherId: otherTeacherId,
      anchorAt: new Date('2099-08-01T00:00:00.000Z'),
    })

    const view = await getStudentDiscipleshipViewService(viewerId)
    expect(view.kind).toBe('assigned')
    if (view.kind !== 'assigned') return

    expect(view.teacher).toEqual({
      id: teacherId,
      fullName: 'Teacher T',
      avatarUrl: null,
    })
    expect(view.individualAnchor).toBe('2026-07-20T10:00:00.000Z')
    expect(view.groupAnchor).toBe('2026-08-15T12:00:00.000Z')
    expect(view.pair).toEqual({
      partner: {
        id: partnerId,
        fullName: 'Partner P',
        avatarUrl: null,
      },
      anchorAt: '2026-08-01T09:00:00.000Z',
    })

    const payload = JSON.stringify(view)
    expect(payload).not.toContain('@secret.dev')
    expect(payload).not.toContain('@test.dev')
    expect(payload).not.toContain('2099-')
    expect(payload).not.toContain(outsiderId)
    expect(payload).not.toContain(otherTeacherId)
    expect(payload).not.toContain('Outsider')

    expect(view.roster.pairs).toHaveLength(1)
    expect(view.roster.pairs[0].members.map((m) => m.fullName)).toEqual([
      'Classmate C',
    ])
    expect(view.roster.solos).toEqual([])
  })
})

describe('getDiscipleshipBoardService (integration)', () => {
  it('still returns the staff board for a teacher', async () => {
    const teacherId = await seedProfile({
      role: 'teacher',
      fullName: 'Board Teacher',
    })
    const studentId = await seedProfile({
      role: 'student',
      fullName: 'Board Student',
    })
    await seedDiscipleshipAssignment({ studentId, teacherId })

    const board = await getDiscipleshipBoardService(teacherId)

    expect(board.isAdmin).toBe(false)
    expect(board.teachers.map((t) => t.id)).toEqual([teacherId])
    expect(board.assignments).toHaveLength(1)
    expect(board.students.some((s) => s.id === studentId)).toBe(true)
  })

  it('rejects students from the manage board', async () => {
    const studentId = await seedProfile({ role: 'student' })

    await expect(getDiscipleshipBoardService(studentId)).rejects.toBeInstanceOf(
      AuthorizationError,
    )
  })
})

describe('discipleship read telemetry (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs safe board and student-view metadata', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({
      role: 'student',
      fullName: 'Private Student',
      email: 'private.student@test.dev',
    })
    await seedDiscipleshipAssignment({
      studentId,
      teacherId,
      anchorAt: new Date('2026-09-12T10:00:00.000Z'),
    })

    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'discipleship-board-request' },
      }),
      () => getDiscipleshipBoardService(teacherId),
    )
    const boardLine = String(infoSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(boardLine)).toMatchObject({
      event: 'discipleship_read_loaded',
      path: 'serverFn:getDiscipleshipBoard',
      requestId: 'discipleship-board-request',
      actorId: teacherId,
      scope: 'teacher',
      teacherCount: 1,
      studentCount: 1,
      assignmentCount: 1,
      pairCount: 0,
      groupCount: 0,
      status: 'success',
      durationMs: expect.any(Number),
    })

    await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'discipleship-student-request' },
      }),
      () => getStudentDiscipleshipViewService(studentId),
    )
    const studentLine = String(infoSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(studentLine)).toMatchObject({
      event: 'discipleship_read_loaded',
      path: 'serverFn:getStudentDiscipleshipView',
      requestId: 'discipleship-student-request',
      actorId: studentId,
      viewKind: 'assigned',
      teacherId,
      pairPresent: false,
      rosterPairCount: 0,
      rosterSoloCount: 0,
      status: 'success',
      durationMs: expect.any(Number),
    })
    expect(`${boardLine}\n${studentLine}`).not.toContain('Private Student')
    expect(`${boardLine}\n${studentLine}`).not.toContain(
      'private.student@test.dev',
    )
    expect(`${boardLine}\n${studentLine}`).not.toContain('2026-09-12')
  })

  it('logs stable persistence failures and keeps expected authorization quiet', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const repositoryError = new Error(
      'connectionString=secret; student email=private.student@test.dev',
    )
    vi.spyOn(
      discipleshipRepository,
      'findDiscipleshipTeachers',
    ).mockRejectedValueOnce(repositoryError)

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'discipleship-read-failure-request' },
        }),
        () => getDiscipleshipBoardService(teacherId),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(JSON.parse(line)).toMatchObject({
      event: 'discipleship_read_failed',
      path: 'serverFn:getDiscipleshipBoard',
      requestId: 'discipleship-read-failure-request',
      actorId: teacherId,
      status: 'failure',
      errorCategory: 'discipleship_read_persistence',
      durationMs: expect.any(Number),
    })
    expect(line).not.toContain('connectionString')
    expect(line).not.toContain('private.student@test.dev')

    errorSpy.mockClear()
    const studentId = await seedProfile({ role: 'student' })
    await expect(getDiscipleshipBoardService(studentId)).rejects.toBeInstanceOf(
      AuthorizationError,
    )
    expect(errorSpy).not.toHaveBeenCalled()
  })
})

describe('discipleship mutation telemetry (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs successful assignment and schedule mutations with safe fields', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })

    await assignStudentToTeacherService({ studentId, teacherId }, teacherId)
    expect(JSON.parse(infoSpy.mock.calls.at(-1)?.[0] as string)).toMatchObject({
      event: 'discipleship_mutation_completed',
      path: 'serverFn:assignStudentToTeacher',
      actorId: teacherId,
      studentId,
      teacherId,
      status: 'success',
      durationMs: expect.any(Number),
    })

    await setIndividualScheduleService(
      { studentId, anchorAt: new Date('2026-09-11T10:00:00.000Z') },
      teacherId,
    )
    const scheduleLog = infoSpy.mock.calls.at(-1)?.[0] as string
    expect(JSON.parse(scheduleLog)).toMatchObject({
      event: 'discipleship_mutation_completed',
      path: 'serverFn:setIndividualSchedule',
      studentId,
      scheduleType: 'individual',
      status: 'success',
    })
    expect(scheduleLog).not.toContain('2026-09-11')
  })

  it('keeps expected pairing conflicts out of error telemetry', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    await seedDiscipleshipAssignment({ studentId, teacherId })

    await expect(
      pairStudentsService(
        { studentIdA: studentId, studentIdB: studentId, teacherId },
        teacherId,
      ),
    ).rejects.toMatchObject({ status: 409 })

    expect(errorSpy).not.toHaveBeenCalled()
  })
})
