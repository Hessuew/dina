import { describe, expect, it } from 'vitest'
import {
  buildEmailCampaignRecipients,
  resolveEmailCampaign,
} from './campaigns.domain'

describe('resolveEmailCampaign', () => {
  it('pairs invitation with the invitation email type and approved_not_registered cohort', () => {
    expect(resolveEmailCampaign('invitation')).toEqual({
      emailType: 'invitation',
      cohort: 'approved_not_registered',
    })
  })
})

describe('buildEmailCampaignRecipients', () => {
  it('keeps approved enrollments without invitations and pending invitations', () => {
    const recipients = buildEmailCampaignRecipients({
      enrollments: [
        { id: 'e-1', email: 'new@test.dev' },
        { id: 'e-2', email: 'pending@test.dev' },
        { id: 'e-3', email: 'accepted@test.dev' },
      ],
      invitations: [
        {
          id: 'i-1',
          email: 'pending@test.dev',
          status: 'pending',
          expiresAt: new Date('2026-01-11T00:00:00Z'),
          token: 'pending-token',
        },
        {
          id: 'i-2',
          email: 'accepted@test.dev',
          status: 'accepted',
          expiresAt: new Date('2026-01-11T00:00:00Z'),
          token: 'accepted-token',
        },
      ],
    })

    expect(recipients).toEqual([
      {
        enrollmentId: 'e-1',
        email: 'new@test.dev',
        invitation: null,
      },
      {
        enrollmentId: 'e-2',
        email: 'pending@test.dev',
        invitation: {
          id: 'i-1',
          status: 'pending',
          expiresAt: new Date('2026-01-11T00:00:00Z'),
          token: 'pending-token',
        },
      },
    ])
  })
})
