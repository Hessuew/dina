import { describe, expect, it } from 'vitest'

import { selectRollbackTarget } from './rollback-target.domain'

describe('selectRollbackTarget', () => {
  it('selects the highest-percentage version from the newest deployment', () => {
    expect(
      selectRollbackTarget([
        {
          created_on: '2026-09-29T12:00:00.000Z',
          versions: [{ version_id: 'old-version', percentage: 100 }],
        },
        {
          created_on: '2026-09-30T12:00:00.000Z',
          versions: [
            { version_id: 'new-version', percentage: 90 },
            { version_id: 'new-canary', percentage: 10 },
          ],
        },
      ]),
    ).toBe('new-version')
  })

  it('fails closed when the newest deployment has no active version', () => {
    expect(() =>
      selectRollbackTarget([
        {
          created_on: '2026-09-30T12:00:00.000Z',
          versions: [],
        },
        {
          created_on: '2026-09-29T12:00:00.000Z',
          versions: [{ version_id: 'old-version', percentage: 100 }],
        },
      ]),
    ).toThrow(/newest Cloudflare deployment/iu)
  })
})
