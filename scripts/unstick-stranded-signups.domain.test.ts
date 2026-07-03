import { describe, expect, it } from 'vitest'

import { classifyStrandedInvitation } from './unstick-stranded-signups.domain.mjs'

describe('classifyStrandedInvitation', () => {
  it('skips a confirmed user (genuinely completed signup)', () => {
    expect(
      classifyStrandedInvitation({
        userFound: true,
        emailConfirmedAt: '2026-07-01T00:00:00Z',
      }),
    ).toBe('skip')
  })

  it('resets and deletes an unconfirmed user (stranded signup)', () => {
    expect(
      classifyStrandedInvitation({ userFound: true, emailConfirmedAt: null }),
    ).toBe('reset-and-delete')
  })

  it('treats a missing confirmation timestamp as unconfirmed', () => {
    expect(
      classifyStrandedInvitation({
        userFound: true,
        emailConfirmedAt: undefined,
      }),
    ).toBe('reset-and-delete')
  })

  it('resets only when no auth user backs the invitation', () => {
    expect(
      classifyStrandedInvitation({ userFound: false, emailConfirmedAt: null }),
    ).toBe('reset-only')
  })
})
