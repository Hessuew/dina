import { describe, expect, it } from 'vitest'
import { MAX_PER_RUN, planBulkSend, summarizeSkips } from './bulk-send.domain'
import type { CampaignRecipient } from './bulk-send.domain'

function recipient(
  overrides: Partial<CampaignRecipient> = {},
): CampaignRecipient {
  return {
    enrollmentId: 'e-1',
    phoneWhatsApp: '+358401234567',
    preferredName: null,
    fullLegalName: 'Maria de la Cruz',
    ...overrides,
  }
}

describe('planBulkSend', () => {
  it('plans a send with normalized phone and resolved recipient name', () => {
    const plan = planBulkSend({
      recipients: [recipient({ phoneWhatsApp: '+358 40 1234567' })],
      alreadySentEnrollmentIds: new Set(),
    })
    expect(plan.toSend).toEqual([
      { enrollmentId: 'e-1', e164: '+358401234567', recipientName: 'Maria' },
    ])
    expect(plan.skipped).toEqual([])
  })

  it('skips already-sent enrollments (dedupe)', () => {
    const plan = planBulkSend({
      recipients: [recipient()],
      alreadySentEnrollmentIds: new Set(['e-1']),
    })
    expect(plan.toSend).toEqual([])
    expect(plan.skipped).toEqual([
      { enrollmentId: 'e-1', reason: 'already_sent' },
    ])
  })

  it('skips recipients whose phone cannot be normalized', () => {
    const plan = planBulkSend({
      recipients: [recipient({ phoneWhatsApp: '0401234567' })],
      alreadySentEnrollmentIds: new Set(),
    })
    expect(plan.toSend).toEqual([])
    expect(plan.skipped).toEqual([
      { enrollmentId: 'e-1', reason: 'invalid_phone' },
    ])
  })

  it('caps sendable rows and reports overflow as over_cap', () => {
    const recipients = [
      recipient({ enrollmentId: 'e-1' }),
      recipient({ enrollmentId: 'e-2' }),
      recipient({ enrollmentId: 'e-3' }),
    ]
    const plan = planBulkSend({
      recipients,
      alreadySentEnrollmentIds: new Set(),
      cap: 2,
    })
    expect(plan.toSend.map((s) => s.enrollmentId)).toEqual(['e-1', 'e-2'])
    expect(plan.skipped).toEqual([{ enrollmentId: 'e-3', reason: 'over_cap' }])
  })

  it('only sendable rows count toward the cap', () => {
    const plan = planBulkSend({
      recipients: [
        recipient({ enrollmentId: 'e-1' }),
        recipient({ enrollmentId: 'e-2', phoneWhatsApp: 'garbage' }),
        recipient({ enrollmentId: 'e-3' }),
      ],
      alreadySentEnrollmentIds: new Set(),
      cap: 2,
    })
    expect(plan.toSend.map((s) => s.enrollmentId)).toEqual(['e-1', 'e-3'])
    expect(plan.skipped).toEqual([
      { enrollmentId: 'e-2', reason: 'invalid_phone' },
    ])
  })

  it('defaults the cap to MAX_PER_RUN', () => {
    const recipients = Array.from({ length: MAX_PER_RUN + 1 }, (_, i) =>
      recipient({ enrollmentId: `e-${i}` }),
    )
    const plan = planBulkSend({
      recipients,
      alreadySentEnrollmentIds: new Set(),
    })
    expect(plan.toSend).toHaveLength(MAX_PER_RUN)
    expect(plan.skipped).toEqual([
      { enrollmentId: `e-${MAX_PER_RUN}`, reason: 'over_cap' },
    ])
  })

  it('uses the preferred name for the {{1}} value when present', () => {
    const plan = planBulkSend({
      recipients: [recipient({ preferredName: 'Mia' })],
      alreadySentEnrollmentIds: new Set(),
    })
    expect(plan.toSend[0].recipientName).toBe('Mia')
  })
})

describe('summarizeSkips', () => {
  it('returns zero counts for no skips', () => {
    expect(summarizeSkips([])).toEqual({
      alreadySent: 0,
      invalidPhone: 0,
      overCap: 0,
    })
  })

  it('counts each skip reason', () => {
    expect(
      summarizeSkips([
        { enrollmentId: 'e-1', reason: 'already_sent' },
        { enrollmentId: 'e-2', reason: 'already_sent' },
        { enrollmentId: 'e-3', reason: 'invalid_phone' },
        { enrollmentId: 'e-4', reason: 'over_cap' },
      ]),
    ).toEqual({ alreadySent: 2, invalidPhone: 1, overCap: 1 })
  })
})
