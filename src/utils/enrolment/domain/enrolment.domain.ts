import crypto from 'node:crypto'
import type { enrollments, invitations } from '@/db/schema'

type Invitation = typeof invitations.$inferSelect

export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function generateInvitationExpiry(): Date {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  return expiresAt
}

export function isInvitationResendable(invitation: Invitation): boolean {
  return invitation.status === 'pending'
}

type EnrollmentSelect = typeof enrollments.$inferSelect

export type MaybeRedactedEnrollment = Omit<
  EnrollmentSelect,
  'email' | 'phoneWhatsApp' | 'invitationSent' | 'invitationId'
> & {
  email?: string
  phoneWhatsApp?: string
  invitationSent?: boolean
  invitationId?: string | null
}

export type EnrollmentStatus = EnrollmentSelect['status']

/**
 * Admin lifecycle decisions that the auto-status engine must not overwrite.
 * Once an enrollment reaches one of these, re-scoring leaves status untouched.
 */
const FROZEN_STATUSES: ReadonlyArray<EnrollmentStatus> = [
  'approved',
  'withdrawn',
  'deferred',
]

/**
 * Derives the enrollment status implied by the assigned Reviewer's score and
 * whether the Reviewer's peer has also evaluated the enrollment.
 *
 * Only the assigned Reviewer drives status (non-assigned evaluators are
 * advisory); the caller is responsible for that gate. Updated mapping (ADR 0008
 * rev 1):
 * - `null` (cleared) → `pending`
 * - `0` / `1` → `rejected`
 * - `2` → `waitlisted`
 * - `3` / `4` AND peer has NOT scored → `under_review` (peer cross-check pending)
 * - `3` / `4` AND peer HAS scored → `awaiting_approval` (admin makes the final call)
 *
 * Returns `null` when nothing should change: the current status is a frozen
 * admin decision, or the computed status already equals the current one.
 */
export function deriveEnrollmentStatus(
  score: number | null,
  peerHasScored: boolean,
  currentStatus: EnrollmentStatus,
): EnrollmentStatus | null {
  if (FROZEN_STATUSES.includes(currentStatus)) return null

  let next: EnrollmentStatus
  if (score === null) next = 'pending'
  else if (score <= 1) next = 'rejected'
  else if (score === 2) next = 'waitlisted'
  else next = peerHasScored ? 'awaiting_approval' : 'under_review'

  return next === currentStatus ? null : next
}

/**
 * Per-enrollment "review heading" data shown in the enrollments table.
 * Shows the assigned Reviewer and their Peer, each with an evaluated flag.
 */
export type ReviewHeading = {
  reviewerFirstName: string | null
  reviewerHasEvaluated: boolean
  peerFirstName: string | null
  peerHasEvaluated: boolean
}

export type EnrollmentWithEvaluation = MaybeRedactedEnrollment & {
  evaluationSum: number
  evaluationCount: number
  reviewHeading: ReviewHeading
}

/**
 * Derives the ReviewHeading for one enrollment from pre-fetched data.
 *
 * @param enrollmentId - the enrollment to compute heading for
 * @param reviewerAssignments - all reviewer assignments for the page
 * @param evaluations - all evaluations for the page (with evaluator names)
 * @param peersForReviewers - map from reviewer ID to their course-partner list
 */
export function deriveReviewHeading(
  enrollmentId: string,
  reviewerAssignments: Array<{
    enrollmentId: string
    reviewerId: string
    reviewerName: string
  }>,
  evaluations: Array<{
    enrollmentId: string
    evaluatorId: string
    evaluatorName: string
    score: number | null
  }>,
  peersForReviewers: Map<string, Array<{ id: string; name: string }>>,
): ReviewHeading {
  const assignment = reviewerAssignments.find(
    (a) => a.enrollmentId === enrollmentId,
  )
  if (!assignment) {
    return {
      reviewerFirstName: null,
      reviewerHasEvaluated: false,
      peerFirstName: null,
      peerHasEvaluated: false,
    }
  }

  const enrollmentEvals = evaluations.filter(
    (e) => e.enrollmentId === enrollmentId,
  )
  const reviewerEval = enrollmentEvals.find(
    (e) => e.evaluatorId === assignment.reviewerId,
  )
  const reviewerHasEvaluated =
    reviewerEval !== undefined && reviewerEval.score !== null

  const peers = peersForReviewers.get(assignment.reviewerId) ?? []
  const peer = peers[0] ?? null
  const peerEval = peer
    ? enrollmentEvals.find((e) => e.evaluatorId === peer.id)
    : undefined
  const peerHasEvaluated = peerEval !== undefined && peerEval.score !== null

  return {
    reviewerFirstName: assignment.reviewerName
      ? assignment.reviewerName.split(' ')[0]
      : null,
    reviewerHasEvaluated,
    peerFirstName: peer ? peer.name.split(' ')[0] : null,
    peerHasEvaluated,
  }
}

/**
 * Round-robin assignment of unassigned enrollments to reviewers.
 *
 * Splits the enrollments into equal contiguous batches (one per teacher) and
 * assigns each batch to a teacher, clamping the final index so any rounding
 * remainder lands on the last teacher. Callers must pass non-empty arrays.
 */
export function buildEnrollmentAssignments(
  unassignedIds: Array<string>,
  teacherIds: Array<string>,
): Array<{ enrollmentId: string; reviewerId: string }> {
  const batchSize = Math.ceil(unassignedIds.length / teacherIds.length)
  return unassignedIds.map((enrollmentId, i) => ({
    enrollmentId,
    reviewerId:
      teacherIds[Math.min(Math.floor(i / batchSize), teacherIds.length - 1)],
  }))
}

export function redactEnrollmentForTeacher(
  enrollment: EnrollmentSelect,
): Omit<
  EnrollmentSelect,
  'email' | 'phoneWhatsApp' | 'invitationSent' | 'invitationId'
> {
  const {
    email: _e,
    phoneWhatsApp: _p,
    invitationSent: _is,
    invitationId: _ii,
    ...rest
  } = enrollment
  return rest
}
