import { describe, expect, it } from 'vitest'
import {
  derivePeerReviewState,
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

describe('derivePeerReviewState', () => {
  const me = 'viewer-1'
  const peer = 'peer-1'
  const peerIds = [peer]

  it('returns under_peer_review when a peer scored 3/4 and viewer has not scored', () => {
    expect(
      derivePeerReviewState([{ evaluatorId: peer, score: 4 }], me, peerIds),
    ).toBe('under_peer_review')
  })

  it('returns peer_reviewed when a peer scored 3/4 and viewer has scored', () => {
    expect(
      derivePeerReviewState(
        [
          { evaluatorId: peer, score: 3 },
          { evaluatorId: me, score: 2 },
        ],
        me,
        peerIds,
      ),
    ).toBe('peer_reviewed')
  })

  it('treats a viewer score of 0 as scored', () => {
    expect(
      derivePeerReviewState(
        [
          { evaluatorId: peer, score: 4 },
          { evaluatorId: me, score: 0 },
        ],
        me,
        peerIds,
      ),
    ).toBe('peer_reviewed')
  })

  it('returns null when the peer score is below 3', () => {
    expect(
      derivePeerReviewState([{ evaluatorId: peer, score: 2 }], me, peerIds),
    ).toBe(null)
  })

  it('returns null when no peer has evaluated', () => {
    expect(
      derivePeerReviewState([{ evaluatorId: me, score: 4 }], me, peerIds),
    ).toBe(null)
  })

  it('ignores high scores from non-peer evaluators', () => {
    expect(
      derivePeerReviewState(
        [{ evaluatorId: 'stranger', score: 4 }],
        me,
        peerIds,
      ),
    ).toBe(null)
  })

  it('returns null when there are no peers', () => {
    expect(
      derivePeerReviewState([{ evaluatorId: peer, score: 4 }], me, []),
    ).toBe(null)
  })
})
