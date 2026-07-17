import { describe, expect, it } from 'vitest'
import {
  MAX_PER_RUN,
  planBulkInvites,
  summarizeInviteSkips,
} from './bulk-invite.domain'
import type { InvitationCampaignRecipient } from './bulk-invite.domain'

const now = new Date('2026-01-10T00:00:00Z')

function recipient(
  overrides: Partial<InvitationCampaignRecipient> = {},
): InvitationCampaignRecipient {
  return {
    enrollmentId: 'e-1',
    email: 'applicant@test.dev',
    invitation: null,
    ...overrides,
  }
}

function invitation(
  overrides: Partial<
    NonNullable<InvitationCampaignRecipient['invitation']>
  > = {},
) {
  return {
    id: 'i-1',
    status: 'pending',
    expiresAt: new Date('2026-01-11T00:00:00Z'),
    token: 'old-token',
    ...overrides,
  }
}

describe('planBulkInvites', () => {
  it('plans never-invited recipients for creation', () => {
    const plan = planBulkInvites({ recipients: [recipient()], now })
    expect(plan.toSend).toEqual([
      {
        enrollmentId: 'e-1',
        email: 'applicant@test.dev',
        invitationId: null,
        invitation: null,
        action: 'create',
      },
    ])
    expect(plan.skipped).toEqual([])
  })

  it('plans expired pending invitations for token rotation', () => {
    const old = invitation({ expiresAt: new Date('2026-01-01T00:00:00Z') })
    const plan = planBulkInvites({
      recipients: [recipient({ invitation: old })],
      now,
    })
    expect(plan.toSend[0]).toMatchObject({
      invitationId: 'i-1',
      invitation: old,
      action: 'rotate',
    })
  })

  it('skips pending invitations while the link is still valid', () => {
    const plan = planBulkInvites({
      recipients: [recipient({ invitation: invitation() })],
      now,
    })
    expect(plan.toSend).toEqual([])
    expect(plan.skipped).toEqual([
      { enrollmentId: 'e-1', reason: 'link_still_valid' },
    ])
  })

  it('plans valid pending invitations for same-link resend when requested', () => {
    const active = invitation()
    const plan = planBulkInvites({
      recipients: [recipient({ invitation: active })],
      now,
      includeValidLinks: true,
    })

    expect(plan.toSend).toEqual([
      {
        enrollmentId: 'e-1',
        email: 'applicant@test.dev',
        invitationId: 'i-1',
        invitation: active,
        action: 'reuse',
      },
    ])
    expect(plan.skipped).toEqual([])
  })

  it('skips revoked invitations', () => {
    const plan = planBulkInvites({
      recipients: [
        recipient({ invitation: invitation({ status: 'revoked' }) }),
      ],
      now,
    })
    expect(plan.toSend).toEqual([])
    expect(plan.skipped).toEqual([{ enrollmentId: 'e-1', reason: 'revoked' }])
  })

  it('caps sendable rows and reports overflow', () => {
    const plan = planBulkInvites({
      recipients: [
        recipient({ enrollmentId: 'e-1' }),
        recipient({ enrollmentId: 'e-2' }),
        recipient({ enrollmentId: 'e-3' }),
      ],
      now,
      cap: 2,
    })
    expect(plan.toSend.map((send) => send.enrollmentId)).toEqual(['e-1', 'e-2'])
    expect(plan.skipped).toEqual([{ enrollmentId: 'e-3', reason: 'over_cap' }])
  })

  it('defaults the cap to MAX_PER_RUN', () => {
    const recipients = Array.from({ length: MAX_PER_RUN + 1 }, (_, i) =>
      recipient({ enrollmentId: `e-${i}` }),
    )
    const plan = planBulkInvites({ recipients, now })
    expect(plan.toSend).toHaveLength(MAX_PER_RUN)
    expect(plan.skipped).toEqual([
      { enrollmentId: `e-${MAX_PER_RUN}`, reason: 'over_cap' },
    ])
  })
})

describe('summarizeInviteSkips', () => {
  it('counts each skip reason', () => {
    expect(
      summarizeInviteSkips([
        { enrollmentId: 'e-1', reason: 'link_still_valid' },
        { enrollmentId: 'e-2', reason: 'revoked' },
        { enrollmentId: 'e-3', reason: 'revoked' },
        { enrollmentId: 'e-4', reason: 'over_cap' },
      ]),
    ).toEqual({ linkStillValid: 1, revoked: 2, overCap: 1 })
  })
})
