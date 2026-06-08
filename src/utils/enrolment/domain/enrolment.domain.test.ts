import { describe, expect, it } from 'vitest'
import {
  buildEnrollmentAssignments,
  deriveEnrollmentStatus,
  deriveReviewHeading,
  generateInvitationExpiry,
  generateSecureToken,
  isInvitationResendable,
} from './enrolment.domain'

const makeInvitation = (
  status: 'pending' | 'accepted' | 'revoked' = 'pending',
) =>
  ({
    id: 'inv-1',
    email: 'test@example.com',
    role: 'student' as const,
    token: 'abc123',
    status,
    invitedBy: 'user-1',
    invitedAt: new Date(),
    expiresAt: new Date(),
    acceptedAt: null,
    otpHash: null,
    otpExpiresAt: null,
    otpAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as const

describe('generateSecureToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateSecureToken()
    expect(token).toHaveLength(64)
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true)
  })

  it('produces a different value on each call', () => {
    expect(generateSecureToken()).not.toBe(generateSecureToken())
  })
})

describe('generateInvitationExpiry', () => {
  it('returns a Date instance', () => {
    expect(generateInvitationExpiry()).toBeInstanceOf(Date)
  })

  it('returns a date 7 days from now', () => {
    const before = Date.now()
    const expiry = generateInvitationExpiry()
    const after = Date.now()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs)
    expect(expiry.getTime()).toBeLessThanOrEqual(after + sevenDaysMs)
  })
})

describe('isInvitationResendable', () => {
  it('returns true for a pending invitation', () => {
    expect(isInvitationResendable(makeInvitation('pending'))).toBe(true)
  })

  it('returns false for an accepted invitation', () => {
    expect(isInvitationResendable(makeInvitation('accepted'))).toBe(false)
  })

  it('returns false for a revoked invitation', () => {
    expect(isInvitationResendable(makeInvitation('revoked'))).toBe(false)
  })
})

describe('deriveEnrollmentStatus', () => {
  it('maps scores 0 and 1 to rejected', () => {
    expect(deriveEnrollmentStatus(0, false, 'pending')).toBe('rejected')
    expect(deriveEnrollmentStatus(1, false, 'pending')).toBe('rejected')
  })

  it('maps score 2 to waitlisted', () => {
    expect(deriveEnrollmentStatus(2, false, 'pending')).toBe('waitlisted')
  })

  it('maps score 3/4 to under_review when peer has not scored', () => {
    expect(deriveEnrollmentStatus(3, false, 'pending')).toBe('under_review')
    expect(deriveEnrollmentStatus(4, false, 'pending')).toBe('under_review')
  })

  it('maps score 3/4 to awaiting_approval when peer has scored', () => {
    expect(deriveEnrollmentStatus(3, true, 'pending')).toBe('awaiting_approval')
    expect(deriveEnrollmentStatus(4, true, 'under_review')).toBe(
      'awaiting_approval',
    )
  })

  it('maps a cleared score to pending', () => {
    expect(deriveEnrollmentStatus(null, false, 'under_review')).toBe('pending')
    expect(deriveEnrollmentStatus(null, false, 'awaiting_approval')).toBe(
      'pending',
    )
  })

  it('does not overwrite frozen admin states', () => {
    expect(deriveEnrollmentStatus(0, false, 'approved')).toBe(null)
    expect(deriveEnrollmentStatus(4, true, 'withdrawn')).toBe(null)
    expect(deriveEnrollmentStatus(2, false, 'deferred')).toBe(null)
  })

  it('returns null when the computed status equals the current one', () => {
    expect(deriveEnrollmentStatus(0, false, 'rejected')).toBe(null)
    expect(deriveEnrollmentStatus(3, true, 'awaiting_approval')).toBe(null)
    expect(deriveEnrollmentStatus(3, false, 'under_review')).toBe(null)
  })
})

describe('deriveReviewHeading', () => {
  const reviewerAssignments = [
    { enrollmentId: 'e1', reviewerId: 'r1', reviewerName: 'Alice Smith' },
  ]
  const evaluations = [
    {
      enrollmentId: 'e1',
      evaluatorId: 'r1',
      evaluatorName: 'Alice Smith',
      score: 4,
    },
    {
      enrollmentId: 'e1',
      evaluatorId: 'p1',
      evaluatorName: 'Bob Jones',
      score: 3,
    },
  ]
  const peersForReviewers = new Map([['r1', [{ id: 'p1', name: 'Bob Jones' }]]])

  it('returns reviewer first name and evaluated flag', () => {
    const heading = deriveReviewHeading(
      'e1',
      reviewerAssignments,
      evaluations,
      peersForReviewers,
    )
    expect(heading.reviewerFirstName).toBe('Alice')
    expect(heading.reviewerHasEvaluated).toBe(true)
  })

  it('returns peer first name and evaluated flag', () => {
    const heading = deriveReviewHeading(
      'e1',
      reviewerAssignments,
      evaluations,
      peersForReviewers,
    )
    expect(heading.peerFirstName).toBe('Bob')
    expect(heading.peerHasEvaluated).toBe(true)
  })

  it('returns reviewerHasEvaluated false when reviewer score is null', () => {
    const evalsNullScore = [
      {
        enrollmentId: 'e1',
        evaluatorId: 'r1',
        evaluatorName: 'Alice Smith',
        score: null,
      },
    ]
    const heading = deriveReviewHeading(
      'e1',
      reviewerAssignments,
      evalsNullScore,
      peersForReviewers,
    )
    expect(heading.reviewerHasEvaluated).toBe(false)
  })

  it('returns peerHasEvaluated false when peer has not evaluated', () => {
    const evalsNoPeer = [
      {
        enrollmentId: 'e1',
        evaluatorId: 'r1',
        evaluatorName: 'Alice Smith',
        score: 4,
      },
    ]
    const heading = deriveReviewHeading(
      'e1',
      reviewerAssignments,
      evalsNoPeer,
      peersForReviewers,
    )
    expect(heading.peerHasEvaluated).toBe(false)
  })

  it('returns null fields when enrollment has no reviewer assignment', () => {
    const heading = deriveReviewHeading(
      'e99',
      reviewerAssignments,
      evaluations,
      peersForReviewers,
    )
    expect(heading).toEqual({
      reviewerFirstName: null,
      reviewerHasEvaluated: false,
      peerFirstName: null,
      peerHasEvaluated: false,
    })
  })

  it('returns null peerFirstName when reviewer has no peer', () => {
    const noPeers = new Map<string, Array<{ id: string; name: string }>>([
      ['r1', []],
    ])
    const heading = deriveReviewHeading(
      'e1',
      reviewerAssignments,
      evaluations,
      noPeers,
    )
    expect(heading.peerFirstName).toBe(null)
    expect(heading.peerHasEvaluated).toBe(false)
  })
})

describe('buildEnrollmentAssignments', () => {
  it('splits evenly across teachers', () => {
    expect(
      buildEnrollmentAssignments(['e1', 'e2', 'e3', 'e4'], ['t0', 't1']),
    ).toEqual([
      { enrollmentId: 'e1', reviewerId: 't0' },
      { enrollmentId: 'e2', reviewerId: 't0' },
      { enrollmentId: 'e3', reviewerId: 't1' },
      { enrollmentId: 'e4', reviewerId: 't1' },
    ])
  })

  it('clamps the remainder onto the last teacher', () => {
    expect(
      buildEnrollmentAssignments(['e1', 'e2', 'e3', 'e4', 'e5'], ['t0', 't1']),
    ).toEqual([
      { enrollmentId: 'e1', reviewerId: 't0' },
      { enrollmentId: 'e2', reviewerId: 't0' },
      { enrollmentId: 'e3', reviewerId: 't0' },
      { enrollmentId: 'e4', reviewerId: 't1' },
      { enrollmentId: 'e5', reviewerId: 't1' },
    ])
  })

  it('assigns every enrollment to the only teacher', () => {
    expect(buildEnrollmentAssignments(['e1', 'e2', 'e3'], ['t0'])).toEqual([
      { enrollmentId: 'e1', reviewerId: 't0' },
      { enrollmentId: 'e2', reviewerId: 't0' },
      { enrollmentId: 'e3', reviewerId: 't0' },
    ])
  })
})
