import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDb } from 'test/integration/db'
import type { EmailSender, InvitationEmailMessage } from '@/utils/email/types'
import {
  bulkGradeEnrollmentsService,
  createEnrollmentService,
  deleteEnrollmentService,
  distributeEnrollmentsService,
  endSubstitutionService,
  getEnrollmentEmailsService,
  getEnrollmentsService,
  searchEnrollmentContactsByNamesService,
  sendInvitationForEnrollmentService,
  setEnrollmentSpecialCaseService,
  setEvaluationAdmissionCategoryService,
  setEvaluationNoteService,
  setEvaluationScoreService,
  substituteTeacherService,
  updateEnrollmentStatusService,
} from '@/utils/enrolment/service/enrolment.service'
import { setStaffPrivilegeService } from '@/utils/staff-privilege/service/staff-privilege.service'
import * as enrollmentRepository from '@/utils/enrolment/repository/enrolment.repository'
import {
  findEnrollmentById,
  findEnrollmentContactLookupCandidates,
  findEnrollmentEmailsByGroup,
  findInvitationByEmail,
} from '@/utils/enrolment/repository/enrolment.repository'
import { AuthorizationError } from '@/utils/errors'
import {
  seedCourse,
  seedCourseTeacher,
  seedEnrollment,
  seedInvitation,
  seedProfile,
  seedReviewerAssignment,
} from '@/../test/integration/seed'
import { setEmailSender } from '@/utils/email'
import { emailMessages } from '@/db/schema'
import { withObservabilityRequest } from '@/utils/observability/request-context'

// Seeds a pending enrollment with an assigned reviewer plus a peer evaluator.
// Both teachers share the same course, making peerId a valid peer evaluator.
async function seedPeerReviewScenario() {
  const reviewerId = await seedProfile({ role: 'teacher' })
  const peerId = await seedProfile({ role: 'teacher' })
  const courseId = await seedCourse()
  await seedCourseTeacher(courseId, reviewerId)
  await seedCourseTeacher(courseId, peerId)
  const enrollmentId = await seedEnrollment({ status: 'pending' })
  await seedReviewerAssignment(enrollmentId, reviewerId, courseId)
  return { reviewerId, peerId, courseId, enrollmentId }
}

function installFakeEmailSender() {
  const calls: Array<InvitationEmailMessage> = []
  const sender: EmailSender = {
    send: async (message) => {
      await Promise.resolve()
      if (message.type !== 'invitation')
        throw new Error('Unexpected email type')
      calls.push(message)
      return { providerMessageId: `email.${calls.length}` }
    },
  }
  setEmailSender(sender)
  return calls
}

const PUBLIC_ENROLLMENT_INPUT = {
  fullLegalName: 'Private Applicant',
  preferredName: 'Applicant',
  email: 'private-applicant@test.dev',
  yearOfBirth: 1995,
  gender: 'female' as const,
  nationalityCitizenship: 'Private Country',
  phoneWhatsApp: '+15555550123',
  currentCity: 'Private City',
  currentCountry: 'Private Country',
  churchAffiliations: 'Private Church',
  aboutYourself: 'Private application details',
  expectationsAlignment: 'Private expectations details',
}

describe('createEnrollmentService telemetry (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs a redacted success event after public enrollment persistence', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const result = await withObservabilityRequest(
      new Request('https://christ-dina.org/enrolment', {
        headers: { 'x-request-id': 'enrollment-request-1' },
      }),
      () => createEnrollmentService(PUBLIC_ENROLLMENT_INPUT),
    )

    const event = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'enrollment_created')

    expect(event).toMatchObject({
      event: 'enrollment_created',
      path: 'serverFn:createEnrollment',
      requestId: 'enrollment-request-1',
      source: 'public_enrollment_form',
      status: 'success',
      enrollmentId: result.enrollment.id,
    })
    expect(event?.durationMs).toEqual(expect.any(Number))
    expect(JSON.stringify(event)).not.toContain('Private Applicant')
    expect(JSON.stringify(event)).not.toContain('private-applicant@test.dev')
    expect(JSON.stringify(event)).not.toContain('Private application details')
  })

  it('logs a stable persistence failure without applicant data', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(enrollmentRepository, 'insertEnrollment').mockRejectedValueOnce(
      new Error('enrollment database secret'),
    )

    await expect(
      createEnrollmentService(PUBLIC_ENROLLMENT_INPUT),
    ).rejects.toThrow('enrollment database secret')

    const serialized = String(errorSpy.mock.calls[0][0])
    const event = JSON.parse(serialized) as Record<string, unknown>
    expect(event).toMatchObject({
      errorCategory: 'enrollment_persistence',
      event: 'enrollment_create_failed',
      path: 'serverFn:createEnrollment',
      source: 'public_enrollment_form',
      status: 'failure',
    })
    expect(event.durationMs).toEqual(expect.any(Number))
    expect(serialized).not.toContain('enrollment database secret')
    expect(serialized).not.toContain('private-applicant@test.dev')
  })
})

describe('setEvaluationScoreService (integration)', () => {
  describe("assigned Reviewer's score auto-derives status (ADR 0008 rev 1)", () => {
    const cases: Array<{
      score: number | null
      peerHasScored: boolean
      expected: string
      description: string
    }> = [
      {
        score: 0,
        peerHasScored: false,
        expected: 'rejected',
        description: 'score 0 → rejected',
      },
      {
        score: 1,
        peerHasScored: false,
        expected: 'rejected',
        description: 'score 1 → rejected',
      },
      {
        score: 2,
        peerHasScored: false,
        expected: 'waitlisted',
        description: 'score 2 → waitlisted',
      },
      {
        score: 3,
        peerHasScored: false,
        expected: 'under_review',
        description: 'score 3, peer not scored → under_review',
      },
      {
        score: 4,
        peerHasScored: false,
        expected: 'under_review',
        description: 'score 4, peer not scored → under_review',
      },
      {
        score: 3,
        peerHasScored: true,
        expected: 'awaiting_approval',
        description: 'score 3, peer scored → awaiting_approval',
      },
      {
        score: 4,
        peerHasScored: true,
        expected: 'awaiting_approval',
        description: 'score 4, peer scored → awaiting_approval',
      },
      {
        score: null,
        peerHasScored: false,
        expected: 'pending',
        description: 'cleared score → pending',
      },
    ]

    it.each(cases)(
      '$description',
      async ({ score, peerHasScored, expected }) => {
        const { reviewerId, peerId, enrollmentId } =
          await seedPeerReviewScenario()

        // If peerHasScored is true, seed a peer evaluation first.
        if (peerHasScored) {
          await setEvaluationScoreService({ enrollmentId, score: 3 }, peerId)
        }

        await setEvaluationScoreService({ enrollmentId, score }, reviewerId)

        const enrollment = await findEnrollmentById(enrollmentId)
        expect(enrollment?.status).toBe(expected)
      },
    )
  })

  it('leaves a frozen admin decision untouched', async () => {
    const reviewerId = await seedProfile({ role: 'teacher' })
    const enrollmentId = await seedEnrollment({ status: 'approved' })
    await seedReviewerAssignment(enrollmentId, reviewerId)

    await setEvaluationScoreService({ enrollmentId, score: 0 }, reviewerId)

    const enrollment = await findEnrollmentById(enrollmentId)
    expect(enrollment?.status).toBe('approved')
  })

  it('keeps a non-assigned evaluator advisory — status unchanged', async () => {
    const { peerId, enrollmentId } = await seedPeerReviewScenario()

    // The peer (not the assigned Reviewer) scores a strong admit.
    await setEvaluationScoreService({ enrollmentId, score: 4 }, peerId)

    const enrollment = await findEnrollmentById(enrollmentId)
    expect(enrollment?.status).toBe('pending')
  })

  it('peer scoring after reviewer 3/4 advances status to awaiting_approval', async () => {
    const { reviewerId, peerId, enrollmentId } = await seedPeerReviewScenario()

    // Reviewer scores first → under_review
    await setEvaluationScoreService({ enrollmentId, score: 4 }, reviewerId)
    expect((await findEnrollmentById(enrollmentId))?.status).toBe(
      'under_review',
    )

    // Peer scores → awaiting_approval
    await setEvaluationScoreService({ enrollmentId, score: 3 }, peerId)
    expect((await findEnrollmentById(enrollmentId))?.status).toBe(
      'awaiting_approval',
    )
  })

  it('rejects a caller who is neither admin nor teacher', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const enrollmentId = await seedEnrollment({ status: 'pending' })

    await expect(
      setEvaluationScoreService({ enrollmentId, score: 3 }, studentId),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })

  it('emits a redacted completion event without evaluation values', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { reviewerId, enrollmentId } = await seedPeerReviewScenario()

    await setEvaluationScoreService({ enrollmentId, score: 4 }, reviewerId)

    const event = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'enrollment_evaluation_updated')

    expect(event).toMatchObject({
      event: 'enrollment_evaluation_updated',
      path: 'serverFn:setEvaluationScore',
      status: 'updated',
      enrollmentId,
      evaluatorId: reviewerId,
      evaluationField: 'score',
    })
    expect(event?.durationMs).toEqual(expect.any(Number))
    expect(event).not.toHaveProperty('score')
    expect(event).not.toHaveProperty('note')
    expect(event).not.toHaveProperty('admissionCategory')
  })

  it('uses the same event shape for category and note updates', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const { reviewerId, enrollmentId } = await seedPeerReviewScenario()

    await setEvaluationAdmissionCategoryService(
      { enrollmentId, score: 4, admissionCategory: 'new' },
      reviewerId,
    )
    await setEvaluationNoteService(
      { enrollmentId, note: 'private mentorship details' },
      reviewerId,
    )

    const events = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .filter((entry) => entry.event === 'enrollment_evaluation_updated')

    expect(events).toHaveLength(2)
    expect(events.map((event) => event.evaluationField)).toEqual([
      'admission_category',
      'note',
    ])
    expect(JSON.stringify(events)).not.toContain('private mentorship details')
  })
})

describe('enrollment lifecycle mutation telemetry (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs a redacted status update event', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const enrollmentId = await seedEnrollment({ status: 'pending' })

    await updateEnrollmentStatusService(
      { enrollmentId, status: 'approved' },
      adminId,
    )

    expect((await findEnrollmentById(enrollmentId))?.status).toBe('approved')
    const event = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'enrollment_status_updated')

    expect(event).toMatchObject({
      event: 'enrollment_status_updated',
      path: 'serverFn:updateEnrollmentStatus',
      status: 'success',
      actorId: adminId,
      enrollmentId,
      enrollmentStatus: 'approved',
    })
    expect(event?.durationMs).toEqual(expect.any(Number))
  })

  it('logs special-case changes without enrollment content', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const enrollmentId = await seedEnrollment()

    await setEnrollmentSpecialCaseService(
      { enrollmentId, specialCase: true },
      adminId,
    )

    expect((await findEnrollmentById(enrollmentId))?.specialCase).toBe(true)
    const event = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'enrollment_special_case_updated')

    expect(event).toMatchObject({
      event: 'enrollment_special_case_updated',
      path: 'serverFn:setEnrollmentSpecialCase',
      status: 'success',
      enrollmentId,
      specialCase: true,
    })
    expect(JSON.stringify(event)).not.toContain('fullLegalName')
    expect(event?.durationMs).toEqual(expect.any(Number))
  })

  it('logs enrollment deletion after persistence succeeds', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const enrollmentId = await seedEnrollment()

    await deleteEnrollmentService({ enrollmentId }, adminId)

    expect(await findEnrollmentById(enrollmentId)).toBeUndefined()
    const event = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'enrollment_deleted')

    expect(event).toMatchObject({
      event: 'enrollment_deleted',
      path: 'serverFn:deleteEnrollment',
      status: 'success',
      actorId: adminId,
      enrollmentId,
    })
    expect(event?.durationMs).toEqual(expect.any(Number))
  })

  it('logs stable persistence categories without raw database details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const statusId = await seedEnrollment()
    const specialCaseId = await seedEnrollment()
    const deleteId = await seedEnrollment()

    vi.spyOn(
      enrollmentRepository,
      'updateEnrollmentStatusById',
    ).mockRejectedValueOnce(new Error('status database secret'))
    await expect(
      updateEnrollmentStatusService(
        { enrollmentId: statusId, status: 'approved' },
        adminId,
      ),
    ).rejects.toThrow('status database secret')

    vi.spyOn(
      enrollmentRepository,
      'updateEnrollmentSpecialCaseById',
    ).mockRejectedValueOnce(new Error('special-case database secret'))
    await expect(
      setEnrollmentSpecialCaseService(
        { enrollmentId: specialCaseId, specialCase: true },
        adminId,
      ),
    ).rejects.toThrow('special-case database secret')

    vi.spyOn(
      enrollmentRepository,
      'deleteEnrollmentById',
    ).mockRejectedValueOnce(new Error('delete database secret'))
    await expect(
      deleteEnrollmentService({ enrollmentId: deleteId }, adminId),
    ).rejects.toThrow('delete database secret')

    const events = errorSpy.mock.calls.map(([line]) => {
      const serialized = String(line)
      return {
        event: JSON.parse(serialized) as Record<string, unknown>,
        serialized,
      }
    })
    expect(events.map(({ event }) => event.errorCategory)).toEqual([
      'enrollment_status_persistence',
      'enrollment_special_case_persistence',
      'enrollment_delete_persistence',
    ])
    expect(events.map(({ event }) => event.status)).toEqual([
      'failure',
      'failure',
      'failure',
    ])
    expect(
      events.every(({ event }) => typeof event.durationMs === 'number'),
    ).toBe(true)
    expect(
      events.every(({ serialized }) => !serialized.includes('secret')),
    ).toBe(true)
  })
})

const LIST_INPUT = {
  page: 1,
  pageSize: 50,
  search: '',
  sortBy: 'createdAt',
  sortDir: 'desc',
  viewAll: true,
} as const

// Course with peer teacher B and (to-be-)absent teacher C, plus substitute A.
// Seeds one enrollment assigned to B (B's own queue) and one unscored enrollment
// assigned to C (handed over to A on substitution), then activates C→A.
async function seedSubstitutionScenario() {
  const absentC = await seedProfile({ role: 'teacher', fullName: 'Cara C' })
  const peerB = await seedProfile({ role: 'teacher', fullName: 'Bella B' })
  const subA = await seedProfile({ role: 'teacher', fullName: 'Subby A' })
  const adminId = await seedProfile({ role: 'admin' })
  const courseId = await seedCourse()
  await seedCourseTeacher(courseId, absentC)
  await seedCourseTeacher(courseId, peerB)

  const bEnrollmentId = await seedEnrollment({ status: 'pending' })
  await seedReviewerAssignment(bEnrollmentId, peerB, courseId)

  const handedOverId = await seedEnrollment({ status: 'pending' })
  await seedReviewerAssignment(handedOverId, absentC, courseId)

  await substituteTeacherService(
    { absentTeacherId: absentC, substituteTeacherId: subA },
    adminId,
  )

  return {
    absentC,
    peerB,
    subA,
    adminId,
    courseId,
    bEnrollmentId,
    handedOverId,
  }
}

describe('teacher substitution — Review heading peer resolution (integration)', () => {
  it('peer slot shows the substitute, never the absent teacher (Bug 1)', async () => {
    const { adminId, bEnrollmentId } = await seedSubstitutionScenario()

    const { enrollments } = await getEnrollmentsService(LIST_INPUT, adminId)
    const row = enrollments.find((e) => e.id === bEnrollmentId)

    // B's own enrollment: reviewer is B, peer must be the substitute (Subby),
    // not the absent teacher (Cara).
    expect(row?.reviewHeading.reviewerFirstName).toBe('Bella')
    expect(row?.reviewHeading.peerFirstName).toBe('Subby')
    expect(row?.reviewHeading.peerFirstName).not.toBe('Cara')
  })

  it("handed-over row shows substitute as reviewer and the absent teacher's peer as peer", async () => {
    const { adminId, handedOverId } = await seedSubstitutionScenario()

    const { enrollments } = await getEnrollmentsService(LIST_INPUT, adminId)
    const row = enrollments.find((e) => e.id === handedOverId)

    expect(row?.reviewHeading.reviewerFirstName).toBe('Subby')
    expect(row?.reviewHeading.peerFirstName).toBe('Bella')
    expect(row?.reviewHeading.peerFirstName).not.toBe('Cara')
  })

  it("substitute's evaluation surfaces to the original teacher's peer queue (Bug 2)", async () => {
    const { peerB, subA, handedOverId } = await seedSubstitutionScenario()

    // Substitute (assigned reviewer of the handed-over row) scores a strong admit.
    await setEvaluationScoreService(
      { enrollmentId: handedOverId, score: 4 },
      subA,
    )

    // The absent teacher's peer (B) views their queue: the row must appear, with
    // the substitute attributed as the evaluating reviewer.
    const { enrollments } = await getEnrollmentsService(
      { ...LIST_INPUT, viewAll: false },
      peerB,
    )
    const row = enrollments.find((e) => e.id === handedOverId)

    expect(row).toBeDefined()
    expect(row?.reviewHeading.reviewerFirstName).toBe('Subby')
    expect(row?.reviewHeading.reviewerHasEvaluated).toBe(true)
    expect(row?.reviewHeading.peerFirstName).toBe('Bella')
  })
})

describe('enrollment distribution and substitution telemetry (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs a redacted distribution completion event with safe counters', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    await seedProfile({ role: 'teacher' })
    await seedEnrollment({ fullLegalName: 'Private Applicant One' })
    await seedEnrollment({ fullLegalName: 'Private Applicant Two' })

    const result = await distributeEnrollmentsService(adminId)

    expect(result).toEqual({ assigned: 2 })
    const event = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'enrollment_distribution_completed')

    expect(event).toMatchObject({
      event: 'enrollment_distribution_completed',
      path: 'serverFn:distributeEnrollments',
      status: 'success',
      actorId: adminId,
      assignedCount: 2,
      unassignedCount: 2,
      reviewerCount: 2,
    })
    expect(event?.durationMs).toEqual(expect.any(Number))
    expect(JSON.stringify(event)).not.toContain('Private Applicant')
  })

  it('logs substitution completion and end events with safe identifiers', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const absentTeacherId = await seedProfile({ role: 'teacher' })
    const substituteTeacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    await seedCourseTeacher(courseId, absentTeacherId)
    const enrollmentId = await seedEnrollment({
      fullLegalName: 'Private Applicant Three',
    })
    await seedReviewerAssignment(enrollmentId, absentTeacherId, courseId)

    const result = await substituteTeacherService(
      { absentTeacherId, substituteTeacherId },
      adminId,
    )
    await endSubstitutionService({ absentTeacherId }, adminId)

    expect(result).toEqual({ reassigned: 1 })
    const events = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .filter((entry) =>
        [
          'enrollment_substitution_completed',
          'enrollment_substitution_ended',
        ].includes(String(entry.event)),
      )

    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({
      event: 'enrollment_substitution_completed',
      path: 'serverFn:substituteTeacher',
      status: 'success',
      actorId: adminId,
      absentTeacherId,
      substituteTeacherId,
      courseId,
      reassignedCount: 1,
    })
    expect(events[1]).toMatchObject({
      event: 'enrollment_substitution_ended',
      path: 'serverFn:endSubstitution',
      status: 'success',
      actorId: adminId,
      absentTeacherId,
      removedCount: 1,
    })
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
    expect(JSON.stringify(events)).not.toContain('Private Applicant')
  })

  it('logs stable persistence categories without raw database details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const absentTeacherId = await seedProfile({ role: 'teacher' })
    const substituteTeacherId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    await seedCourseTeacher(courseId, absentTeacherId)
    await seedEnrollment()
    const substitutionEnrollmentId = await seedEnrollment()
    await seedReviewerAssignment(
      substitutionEnrollmentId,
      absentTeacherId,
      courseId,
    )

    vi.spyOn(
      enrollmentRepository,
      'bulkAssignEnrollments',
    ).mockRejectedValueOnce(new Error('distribution database secret'))
    await expect(distributeEnrollmentsService(adminId)).rejects.toThrow(
      'Failed to distribute enrollments',
    )

    vi.spyOn(
      enrollmentRepository,
      'insertSubstituteWithReassignment',
    ).mockRejectedValueOnce(new Error('substitution database secret'))
    await expect(
      substituteTeacherService(
        { absentTeacherId, substituteTeacherId },
        adminId,
      ),
    ).rejects.toThrow('substitution database secret')

    vi.spyOn(
      enrollmentRepository,
      'deleteCourseSubstituteByAbsent',
    ).mockRejectedValueOnce(new Error('substitution end database secret'))
    await expect(
      endSubstitutionService({ absentTeacherId }, adminId),
    ).rejects.toThrow('substitution end database secret')

    const events = errorSpy.mock.calls.map(([line]) => {
      const serialized = String(line)
      return {
        event: JSON.parse(serialized) as Record<string, unknown>,
        serialized,
      }
    })
    expect(events.map(({ event }) => event.errorCategory)).toEqual([
      'enrollment_distribution_persistence',
      'enrollment_substitution_persistence',
      'enrollment_substitution_end_persistence',
    ])
    expect(events.map(({ event }) => event.status)).toEqual([
      'failure',
      'failure',
      'failure',
    ])
    expect(
      events.every(({ event }) => typeof event.durationMs === 'number'),
    ).toBe(true)
    expect(
      events.every(({ serialized }) => !serialized.includes('secret')),
    ).toBe(true)
  })
})

describe('bulk enrollment grading telemetry (integration)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const rows = [
    { id: 'enrollment-approved', sum: 8, specialCase: false },
    { id: 'enrollment-waitlisted', sum: 5, specialCase: false },
    { id: 'enrollment-rejected', sum: 1, specialCase: false },
    { id: 'enrollment-special', sum: 0, specialCase: true },
  ]

  it('logs a redacted preview event with thresholds and safe counters', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    vi.spyOn(
      enrollmentRepository,
      'findAwaitingApprovalIdsWithSum',
    ).mockResolvedValue(rows)

    const result = await bulkGradeEnrollmentsService(
      { approveMin: 6, waitlistMin: 3, dryRun: true },
      adminId,
    )

    expect(result).toEqual({
      approved: 2,
      waitlisted: 1,
      rejected: 1,
      total: 4,
    })
    const event = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'enrollment_bulk_grade_completed')

    expect(event).toMatchObject({
      event: 'enrollment_bulk_grade_completed',
      path: 'serverFn:bulkGradeEnrollments',
      status: 'success',
      actorId: adminId,
      approveMin: 6,
      waitlistMin: 3,
      dryRun: true,
      awaitingApprovalCount: 4,
      specialCaseCount: 1,
      approved: 2,
      waitlisted: 1,
      rejected: 1,
      total: 4,
    })
    expect(event?.durationMs).toEqual(expect.any(Number))
    expect(JSON.stringify(event)).not.toContain('enrollment-approved')
  })

  it('logs execute completion and applies threshold statuses', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    vi.spyOn(
      enrollmentRepository,
      'findAwaitingApprovalIdsWithSum',
    ).mockResolvedValue(rows)
    const updateSpy = vi
      .spyOn(enrollmentRepository, 'bulkUpdateEnrollmentStatuses')
      .mockResolvedValue()

    await bulkGradeEnrollmentsService(
      { approveMin: 6, waitlistMin: 3, dryRun: false },
      adminId,
    )

    expect(updateSpy).toHaveBeenCalledWith([
      { id: 'enrollment-approved', status: 'approved' },
      { id: 'enrollment-waitlisted', status: 'waitlisted' },
      { id: 'enrollment-rejected', status: 'rejected' },
      { id: 'enrollment-special', status: 'approved' },
    ])
    const event = infoSpy.mock.calls
      .map(([line]) => JSON.parse(String(line)) as Record<string, unknown>)
      .find((entry) => entry.event === 'enrollment_bulk_grade_completed')
    expect(event).toMatchObject({ dryRun: false, total: 4 })
  })

  it('logs stable read and update persistence categories without raw errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const adminId = await seedProfile({ role: 'admin' })
    const readSpy = vi
      .spyOn(enrollmentRepository, 'findAwaitingApprovalIdsWithSum')
      .mockRejectedValueOnce(new Error('bulk grade read secret'))

    await expect(
      bulkGradeEnrollmentsService({ approveMin: 6, dryRun: true }, adminId),
    ).rejects.toThrow('bulk grade read secret')

    readSpy.mockResolvedValue(rows)
    vi.spyOn(
      enrollmentRepository,
      'bulkUpdateEnrollmentStatuses',
    ).mockRejectedValueOnce(new Error('bulk grade update secret'))

    await expect(
      bulkGradeEnrollmentsService({ approveMin: 6, dryRun: false }, adminId),
    ).rejects.toThrow('bulk grade update secret')

    const events = errorSpy.mock.calls.map(([line]) => {
      const serialized = String(line)
      return {
        event: JSON.parse(serialized) as Record<string, unknown>,
        serialized,
      }
    })
    expect(events.map(({ event }) => event.errorCategory)).toEqual([
      'enrollment_bulk_grade_read_persistence',
      'enrollment_bulk_grade_update_persistence',
    ])
    expect(events.every(({ event }) => event.status === 'failure')).toBe(true)
    expect(
      events.every(({ serialized }) => !serialized.includes('secret')),
    ).toBe(true)
  })
})

describe('findEnrollmentEmailsByGroup — export cohorts (integration)', () => {
  // Seeds four enrollments spanning every cohort boundary:
  // - registered@   approved + linked invitation accepted   → registered
  // - notreg@       approved + invitation_sent, still pending → not_registered
  // - noinvite@     approved, never invited                  → approved only
  // - pending@      pending, never invited                   → all only
  async function seedExportCohorts() {
    const accepted = await seedInvitation({ status: 'accepted' })
    await seedEnrollment({
      email: 'registered@test.dev',
      status: 'approved',
      invitationSent: true,
      invitationId: accepted.id,
    })
    const pendingInvite = await seedInvitation({ status: 'pending' })
    await seedEnrollment({
      email: 'notreg@test.dev',
      status: 'approved',
      invitationSent: true,
      invitationId: pendingInvite.id,
    })
    await seedEnrollment({ email: 'noinvite@test.dev', status: 'approved' })
    await seedEnrollment({ email: 'pending@test.dev', status: 'pending' })
  }

  const cases: Array<{
    group: 'all' | 'approved' | 'registered' | 'not_registered'
    expected: Array<string>
  }> = [
    {
      group: 'all',
      expected: [
        'registered@test.dev',
        'notreg@test.dev',
        'noinvite@test.dev',
        'pending@test.dev',
      ],
    },
    {
      group: 'approved',
      expected: ['registered@test.dev', 'notreg@test.dev', 'noinvite@test.dev'],
    },
    { group: 'registered', expected: ['registered@test.dev'] },
    { group: 'not_registered', expected: ['notreg@test.dev'] },
  ]

  it.each(cases)(
    '$group cohort returns the right emails',
    async ({ group, expected }) => {
      await seedExportCohorts()
      const emails = await findEnrollmentEmailsByGroup(group)
      expect([...emails].sort()).toEqual([...expected].sort())
    },
  )

  it('rejects teacher access to contact export cohorts', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })

    await expect(
      getEnrollmentEmailsService({ group: 'all' }, teacherId),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })

  it('lets a Teacher-user with enrolment contact export read cohorts', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const teacherId = await seedProfile({ role: 'teacher' })
    await seedExportCohorts()
    await setStaffPrivilegeService(adminId, {
      userId: teacherId,
      privilege: 'enrollment_contact_export',
      granted: true,
    })

    const { emails } = await getEnrollmentEmailsService(
      { group: 'registered' },
      teacherId,
    )
    expect(emails).toEqual(['registered@test.dev'])
  })
})

describe('enrollment contact lookup by name (integration)', () => {
  async function seedLookupEnrollments() {
    await seedEnrollment({
      fullLegalName: 'Maria Santos',
      preferredName: 'Mia',
      email: 'maria@test.dev',
      phoneWhatsApp: '+358 40 1234567',
      status: 'approved',
    })
    await seedEnrollment({
      fullLegalName: 'John Smith',
      email: 'john@test.dev',
      status: 'pending',
    })
    await seedEnrollment({
      fullLegalName: 'Jane Smith',
      email: 'jane@test.dev',
      status: 'approved',
    })
  }

  it('finds candidates by full legal name and preferred name', async () => {
    await seedLookupEnrollments()

    const rows = await findEnrollmentContactLookupCandidates([
      'Maria Santos',
      'Mia',
    ])

    expect(rows.map((row) => row.email).sort()).toEqual(['maria@test.dev'])
    expect(rows[0]?.phoneWhatsApp).toBe('+358 40 1234567')
  })

  it('lets admins search pasted names and receives grouped contact matches', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await seedLookupEnrollments()

    const result = await searchEnrollmentContactsByNamesService(
      { names: 'Mia\nSmith\nUnknown Person' },
      adminId,
    )

    expect(result.groups).toHaveLength(3)
    expect(result.groups[0].matches[0]).toMatchObject({
      email: 'maria@test.dev',
      phoneWhatsApp: '+358 40 1234567',
      matchedName: 'Mia',
    })
    expect(result.groups[1].matches.map((match) => match.email).sort()).toEqual(
      ['jane@test.dev', 'john@test.dev'],
    )
    expect(result.groups[2]).toMatchObject({
      query: 'Unknown Person',
      matches: [],
      suggestions: [],
    })
  })

  it('rejects teacher access for manual contact lookup', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    await seedLookupEnrollments()

    await expect(
      searchEnrollmentContactsByNamesService({ names: 'Mia' }, teacherId),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })

  it('lets a privileged Teacher-user look up contacts', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const teacherId = await seedProfile({ role: 'teacher' })
    await seedLookupEnrollments()
    await setStaffPrivilegeService(adminId, {
      userId: teacherId,
      privilege: 'enrollment_contact_export',
      granted: true,
    })

    const result = await searchEnrollmentContactsByNamesService(
      { names: 'Mia' },
      teacherId,
    )
    expect(result.groups[0].matches[0]?.email).toBe('maria@test.dev')
  })
})

describe('sendInvitationForEnrollmentService (integration)', () => {
  it('uses the shared sender seam without writing bulk campaign logs', async () => {
    const adminId = await seedProfile({
      role: 'admin',
      email: 'admin@test.dev',
      fullName: 'Admin User',
    })
    const calls = installFakeEmailSender()
    const enrollmentId = await seedEnrollment({
      status: 'approved',
      email: 'approved@test.dev',
    })

    const result = await sendInvitationForEnrollmentService(
      { enrollmentId },
      adminId,
      'admin@test.dev',
    )

    expect(result.invitationId).toBeDefined()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      to: 'approved@test.dev',
      invitedByName: 'Admin User',
      role: 'student',
    })
    expect(await findInvitationByEmail('approved@test.dev')).toMatchObject({
      id: result.invitationId,
      status: 'pending',
    })
    const db = await getDb()
    expect(await db.select().from(emailMessages)).toEqual([])
  })
})
