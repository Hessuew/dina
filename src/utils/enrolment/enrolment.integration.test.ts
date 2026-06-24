import { describe, expect, it } from 'vitest'
import {
  getEnrollmentsService,
  setEvaluationScoreService,
  substituteTeacherService,
} from '@/utils/enrolment/service/enrolment.service'
import { findEnrollmentById } from '@/utils/enrolment/repository/enrolment.repository'
import { AuthorizationError } from '@/utils/errors'
import {
  seedCourse,
  seedCourseTeacher,
  seedEnrollment,
  seedProfile,
  seedReviewerAssignment,
} from '@/../test/integration/seed'

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
