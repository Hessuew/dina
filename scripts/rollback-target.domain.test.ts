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

  it('fails closed when the newest deployment has tied active versions', () => {
    expect(() =>
      selectRollbackTarget([
        {
          created_on: '2026-09-30T12:00:00.000Z',
          versions: [
            { version_id: 'first-canary', percentage: 50 },
            { version_id: 'second-canary', percentage: 50 },
          ],
        },
      ]),
    ).toThrow(/ambiguous active versions/iu)
  })

  it('requires an explicit legacy signal for an unannotated target', () => {
    expect(() =>
      selectRollbackTargetInfo({
        deployments: [
          {
            created_on: '2026-09-30T12:00:00.000Z',
            versions: [{ version_id: 'legacy-version', percentage: 100 }],
          },
        ],
        version: { id: 'legacy-version' },
        legacyVersionIds: [],
      }),
    ).toThrow(/explicit legacy verification/iu)
  })

  it('marks an explicitly allowlisted unannotated target as legacy-compatible', () => {
    expect(
      selectRollbackTargetInfo({
        deployments: [
          {
            created_on: '2026-09-30T12:00:00.000Z',
            versions: [{ version_id: 'legacy-version', percentage: 100 }],
          },
        ],
        version: { id: 'legacy-version' },
        legacyVersionIds: ['legacy-version'],
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
        version: {
          id: 'partial-version',
          annotations: { 'workers/tag': 'v2026.09.30.1' },
        },
        legacyVersionIds: [],
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
        version: {
          id: 'release-version',
          annotations: {
            'workers/tag': 'v2026.09.30.1',
            'workers/message': 'DINA v2026.09.30.1 (sha)',
          },
        },
        legacyVersionIds: [],
      }),
    ).toEqual({ versionId: 'release-version', legacyCompatible: false })
  })

  it('rejects metadata for a different selected version', () => {
    expect(() =>
      selectRollbackTargetInfo({
        deployments: [
          {
            created_on: '2026-09-30T12:00:00.000Z',
            versions: [{ version_id: 'active-version', percentage: 100 }],
          },
        ],
        version: { id: 'stale-version' },
        legacyVersionIds: [],
      }),
    ).toThrow(/did not match/iu)
  })
})
