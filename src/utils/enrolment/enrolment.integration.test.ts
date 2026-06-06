import { describe, expect, it } from 'vitest'
import { setEvaluationScoreService } from '@/utils/enrolment/service/enrolment.service'
import { findEnrollmentById } from '@/utils/enrolment/repository/enrolment.repository'
import { AuthorizationError } from '@/utils/errors'
import {
  seedEnrollment,
  seedProfile,
  seedReviewerAssignment,
} from '../../../test/integration/seed'

describe('setEvaluationScoreService (integration)', () => {
  describe("assigned Reviewer's score auto-derives status (ADR 0008)", () => {
    const cases: Array<[number | null, string]> = [
      [0, 'rejected'],
      [1, 'rejected'],
      [2, 'waitlisted'],
      [3, 'awaiting_approval'],
      [4, 'awaiting_approval'],
      [null, 'under_review'],
    ]

    it.each(cases)('score %s → %s', async (score, expected) => {
      const reviewerId = await seedProfile({ role: 'teacher' })
      const enrollmentId = await seedEnrollment({ status: 'pending' })
      await seedReviewerAssignment(enrollmentId, reviewerId)

      await setEvaluationScoreService({ enrollmentId, score }, reviewerId)

      const enrollment = await findEnrollmentById(enrollmentId)
      expect(enrollment?.status).toBe(expected)
    })
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
    const enrollmentId = await seedEnrollment({ status: 'pending' })
    await seedReviewerAssignment(enrollmentId, reviewerId)

    // The peer (not the assigned Reviewer) scores a strong admit.
    await setEvaluationScoreService({ enrollmentId, score: 4 }, peerId)

    const enrollment = await findEnrollmentById(enrollmentId)
    expect(enrollment?.status).toBe('pending')
  })

  it('rejects a caller who is neither admin nor teacher', async () => {
    const studentId = await seedProfile({ role: 'student' })
    const enrollmentId = await seedEnrollment({ status: 'pending' })

    await expect(
      setEvaluationScoreService({ enrollmentId, score: 3 }, studentId),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })
})
