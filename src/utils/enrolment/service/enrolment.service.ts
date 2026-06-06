import type { SetEvaluationScoreInput } from '@/schemas/enrollment.schema'
import { deriveEnrollmentStatusFromReviewerScore } from '@/utils/enrolment/domain/enrolment.domain'
import {
  findEnrollmentById,
  findPeerTeacherIds,
  findReviewerIdForEnrollment,
  updateEnrollmentStatusById,
  upsertEvaluation,
} from '@/utils/enrolment/repository/enrolment.repository'
import { resolveAdminOrTeacherAccess, withRequestCache } from '@/utils/authz'
import { AuthorizationError } from '@/utils/errors'

/**
 * Throws if a non-admin user is not authorized to evaluate the given enrollment.
 * Eligible callers: the assigned Reviewer, or a peer teacher (course partner).
 * Admins bypass the check entirely.
 */
export async function assertEvaluationAuthorized(
  enrollmentId: string,
  userId: string,
  isAdmin: boolean,
): Promise<void> {
  if (isAdmin) return
  const [reviewerId, peerIds] = await Promise.all([
    findReviewerIdForEnrollment(enrollmentId),
    findPeerTeacherIds(userId),
  ])
  if (reviewerId !== userId && !peerIds.includes(userId)) {
    throw new AuthorizationError('not authorized to evaluate this enrollment', {
      code: 'ACTION_NOT_ALLOWED',
      details: { enrollmentId },
    })
  }
}

/**
 * Records the caller's Enrollment Evaluation score, then — only when the caller is
 * the assigned Reviewer — auto-derives and persists the enrollment status from that
 * score (ADR 0008). Peer / non-assigned evaluators stay advisory and never move
 * status. Frozen admin decisions are left untouched (the derive returns null).
 */
export async function setEvaluationScoreService(
  data: SetEvaluationScoreInput,
  userId: string,
) {
  return withRequestCache(async () => {
    const { isAdmin, isTeacher } = await resolveAdminOrTeacherAccess(userId)
    if (!isAdmin && !isTeacher) {
      throw new AuthorizationError('admin or teacher access required', {
        code: 'ROLE_REQUIRED',
        details: {},
      })
    }

    // Fetch reviewerId once — reused for both the authz check and status derivation.
    const reviewerId = await findReviewerIdForEnrollment(data.enrollmentId)

    if (!isAdmin) {
      const peerIds = await findPeerTeacherIds(userId)
      if (reviewerId !== userId && !peerIds.includes(userId)) {
        throw new AuthorizationError(
          'not authorized to evaluate this enrollment',
          {
            code: 'ACTION_NOT_ALLOWED',
            details: { enrollmentId: data.enrollmentId },
          },
        )
      }
    }

    await upsertEvaluation(data.enrollmentId, userId, { score: data.score })

    if (reviewerId === userId) {
      const enrollment = await findEnrollmentById(data.enrollmentId)
      if (enrollment) {
        const nextStatus = deriveEnrollmentStatusFromReviewerScore(
          data.score,
          enrollment.status,
        )
        if (nextStatus !== null) {
          await updateEnrollmentStatusById(data.enrollmentId, nextStatus)
        }
      }
    }
  })
}
