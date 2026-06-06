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

export type PeerReviewState = 'under_peer_review' | 'peer_reviewed' | null

export type EnrollmentWithEvaluation = MaybeRedactedEnrollment & {
  evaluationSum: number
  evaluationCount: number
  peerReviewState: PeerReviewState
}

/**
 * Derives the viewer's peer-review state for one enrollment.
 *
 * A teacher peer-reviews their course partner's high-stakes admits: when a
 * peer (the other teacher on the viewer's course) scored 3 or 4, the viewer is
 * expected to add their own evaluation as a second evaluator.
 *
 * - `under_peer_review` — a peer scored 3/4 and the viewer has not scored yet.
 * - `peer_reviewed` — a peer scored 3/4 and the viewer has scored.
 * - `null` — no peer scored 3/4 (not in the viewer's peer queue).
 */
export function derivePeerReviewState(
  evaluations: Array<{ evaluatorId: string; score: number | null }>,
  viewerId: string,
  peerIds: Array<string>,
): PeerReviewState {
  const peerSet = new Set(peerIds)
  const peerGaveHighScore = evaluations.some(
    (e) => peerSet.has(e.evaluatorId) && (e.score === 3 || e.score === 4),
  )
  if (!peerGaveHighScore) return null
  const viewerScored = evaluations.some(
    (e) => e.evaluatorId === viewerId && e.score !== null,
  )
  return viewerScored ? 'peer_reviewed' : 'under_peer_review'
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
