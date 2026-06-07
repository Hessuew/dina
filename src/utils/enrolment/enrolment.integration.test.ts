import { describe, expect, it } from 'vitest'
import { setEvaluationScoreService } from '@/utils/enrolment/service/enrolment.service'
import { findEnrollmentById } from '@/utils/enrolment/repository/enrolment.repository'
import { AuthorizationError } from '@/utils/errors'
import {
  seedCourse,
  seedCourseTeacher,
  seedEnrollment,
  seedProfile,
  seedReviewerAssignment,
} from '@/../test/integration/seed'

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
        const reviewerId = await seedProfile({ role: 'teacher' })
        const peerId = await seedProfile({ role: 'teacher' })
        const courseId = await seedCourse()
        // Both teachers share the same course, making peerId a valid peer evaluator.
        await seedCourseTeacher(courseId, reviewerId)
        await seedCourseTeacher(courseId, peerId)
        const enrollmentId = await seedEnrollment({ status: 'pending' })
        await seedReviewerAssignment(enrollmentId, reviewerId)

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
    const reviewerId = await seedProfile({ role: 'teacher' })
    const peerId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    // Both teachers share the same course, making peerId a valid peer evaluator.
    await seedCourseTeacher(courseId, reviewerId)
    await seedCourseTeacher(courseId, peerId)
    const enrollmentId = await seedEnrollment({ status: 'pending' })
    await seedReviewerAssignment(enrollmentId, reviewerId)

    // The peer (not the assigned Reviewer) scores a strong admit.
    await setEvaluationScoreService({ enrollmentId, score: 4 }, peerId)

    const enrollment = await findEnrollmentById(enrollmentId)
    expect(enrollment?.status).toBe('pending')
  })

  it('peer scoring after reviewer 3/4 advances status to awaiting_approval', async () => {
    const reviewerId = await seedProfile({ role: 'teacher' })
    const peerId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    await seedCourseTeacher(courseId, reviewerId)
    await seedCourseTeacher(courseId, peerId)
    const enrollmentId = await seedEnrollment({ status: 'pending' })
    await seedReviewerAssignment(enrollmentId, reviewerId)

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
