import { describe, expect, it } from 'vitest'

import {
  selectRollbackTarget,
  selectRollbackTargetInfo,
} from './rollback-target.domain'

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

  it('marks an unannotated target as legacy-compatible', () => {
    expect(
      selectRollbackTargetInfo({
        deployments: [
          {
            created_on: '2026-09-30T12:00:00.000Z',
            versions: [{ version_id: 'legacy-version', percentage: 100 }],
          },
        ],
        versions: [{ id: 'legacy-version' }],
      }),
    ).toEqual({ versionId: 'legacy-version', legacyCompatible: true })
  })

  it('requires complete release annotations for non-legacy targets', () => {
    expect(() =>
      selectRollbackTargetInfo({
        deployments: [
          {
            created_on: '2026-09-30T12:00:00.000Z',
            versions: [{ version_id: 'partial-version', percentage: 100 }],
          },
        ],
        versions: [
          {
            id: 'partial-version',
            annotations: { 'workers/tag': 'v2026.09.30.1' },
          },
        ],
      }),
    ).toThrow(/incomplete release metadata/iu)
  })

  it('marks a release-annotated target as strict', () => {
    expect(
      selectRollbackTargetInfo({
        deployments: [
          {
            created_on: '2026-09-30T12:00:00.000Z',
            versions: [{ version_id: 'release-version', percentage: 100 }],
          },
        ],
        versions: [
          {
            id: 'release-version',
            annotations: {
              'workers/tag': 'v2026.09.30.1',
              'workers/message': 'DINA v2026.09.30.1 (sha)',
            },
          },
        ],
      }),
    ).toEqual({ versionId: 'release-version', legacyCompatible: false })
  })
})
