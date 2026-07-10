import { describe, expect, it } from 'vitest'
import { getDb } from 'test/integration/db'
import type { EmailSender, InvitationEmailMessage } from '@/utils/email/types'
import {
  getEnrollmentsService,
  searchEnrollmentEmailsByNamesService,
  sendInvitationForEnrollmentService,
  setEvaluationScoreService,
  substituteTeacherService,
} from '@/utils/enrolment/service/enrolment.service'
import {
  findEnrollmentById,
  findEnrollmentEmailLookupCandidates,
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
})

describe('enrollment email lookup by name (integration)', () => {
  async function seedLookupEnrollments() {
    await seedEnrollment({
      fullLegalName: 'Maria Santos',
      preferredName: 'Mia',
      email: 'maria@test.dev',
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

    const rows = await findEnrollmentEmailLookupCandidates([
      'Maria Santos',
      'Mia',
    ])

    expect(rows.map((row) => row.email).sort()).toEqual(['maria@test.dev'])
  })

  it('lets admins search pasted names and receives grouped email matches', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await seedLookupEnrollments()

    const result = await searchEnrollmentEmailsByNamesService(
      { names: 'Mia\nSmith\nUnknown Person' },
      adminId,
    )

    expect(result.groups).toHaveLength(3)
    expect(result.groups[0].matches[0]).toMatchObject({
      email: 'maria@test.dev',
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

  it('rejects teacher access for manual email lookup', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    await seedLookupEnrollments()

    await expect(
      searchEnrollmentEmailsByNamesService({ names: 'Mia' }, teacherId),
    ).rejects.toBeInstanceOf(AuthorizationError)
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
