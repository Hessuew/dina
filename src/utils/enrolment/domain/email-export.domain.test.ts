import { describe, expect, it } from 'vitest'
import { selectEnrollmentEmailsByGroup } from './email-export.domain'

const enrollments = [
  {
    email: 'registered@test.dev',
    status: 'approved' as const,
    invitationSent: true,
    invitationId: 'accepted-invitation',
  },
  {
    email: 'notreg@test.dev',
    status: 'approved' as const,
    invitationSent: true,
    invitationId: 'pending-invitation',
  },
  {
    email: 'noinvite@test.dev',
    status: 'approved' as const,
    invitationSent: false,
    invitationId: null,
  },
  {
    email: 'pending@test.dev',
    status: 'pending' as const,
    invitationSent: false,
    invitationId: null,
  },
]

const invitations = [
  { id: 'accepted-invitation', status: 'accepted' as const },
  { id: 'pending-invitation', status: 'pending' as const },
]

describe('selectEnrollmentEmailsByGroup', () => {
  it.each([
    [
      'all',
      [
        'registered@test.dev',
        'notreg@test.dev',
        'noinvite@test.dev',
        'pending@test.dev',
      ],
    ],
    [
      'approved',
      ['registered@test.dev', 'notreg@test.dev', 'noinvite@test.dev'],
    ],
    ['registered', ['registered@test.dev']],
    ['not_registered', ['notreg@test.dev']],
  ] as const)('%s preserves the export cohort rules', (group, expected) => {
    expect(
      selectEnrollmentEmailsByGroup({ group, enrollments, invitations }),
    ).toEqual(expected)
  })
})
