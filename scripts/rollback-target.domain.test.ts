import { describe, expect, it } from 'vitest'

import {
  selectRollbackTarget,
  selectRollbackTargetInfo,
} from './rollback-target.domain'

const verifiedReleaseCommit = 'a'.repeat(40)

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

  it('fails closed when deployments share the newest timestamp', () => {
    expect(() =>
      selectRollbackTarget([
        {
          created_on: '2026-09-30T12:00:00.000Z',
          versions: [{ version_id: 'first-deployment', percentage: 100 }],
        },
        {
          created_on: '2026-09-30T12:00:00.000Z',
          versions: [{ version_id: 'second-deployment', percentage: 100 }],
        },
      ]),
    ).toThrow(/ambiguous newest timestamp/iu)
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
    ).toEqual({
      versionId: 'legacy-version',
      legacyCompatible: true,
      releaseTag: null,
    })
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
            'workers/message': `DINA v2026.09.30.1 (${verifiedReleaseCommit})`,
          },
        },
        legacyVersionIds: [],
        verifiedReleaseBindings: {
          'v2026.09.30.1': {
            commitSha: verifiedReleaseCommit,
            cloudflareVersionId: 'release-version',
          },
        },
      }),
    ).toEqual({
      versionId: 'release-version',
      legacyCompatible: false,
      releaseTag: 'v2026.09.30.1',
    })
  })

  it('rejects manually tagged versions outside the release format', () => {
    expect(() =>
      selectRollbackTargetInfo({
        deployments: [
          {
            created_on: '2026-09-30T12:00:00.000Z',
            versions: [{ version_id: 'manual-version', percentage: 100 }],
          },
        ],
        version: {
          id: 'manual-version',
          annotations: {
            'workers/tag': 'canary',
            'workers/message': 'manual upload',
          },
        },
        legacyVersionIds: [],
      }),
    ).toThrow(/invalid release tag/iu)
  })

  it('rejects release-shaped tags that are not verified repository tags', () => {
    const unverifiedCommit = 'b'.repeat(40)
    expect(() =>
      selectRollbackTargetInfo({
        deployments: [
          {
            created_on: '2026-09-30T12:00:00.000Z',
            versions: [{ version_id: 'unverified-version', percentage: 100 }],
          },
        ],
        version: {
          id: 'unverified-version',
          annotations: {
            'workers/tag': 'v2026.09.30.999',
            'workers/message': `DINA v2026.09.30.999 (${unverifiedCommit})`,
          },
        },
        legacyVersionIds: [],
        verifiedReleaseBindings: {},
      }),
    ).toThrow(/release identity was not verified/iu)
  })

  it('rejects a manual upload that reuses a verified release tag', () => {
    expect(() =>
      selectRollbackTargetInfo({
        deployments: [
          {
            created_on: '2026-09-30T12:00:00.000Z',
            versions: [{ version_id: 'manual-version', percentage: 100 }],
          },
        ],
        version: {
          id: 'manual-version',
          annotations: {
            'workers/tag': 'v2026.09.30.1',
            'workers/message': 'manual upload',
          },
        },
        legacyVersionIds: [],
        verifiedReleaseBindings: {
          'v2026.09.30.1': {
            commitSha: verifiedReleaseCommit,
            cloudflareVersionId: 'manual-version',
          },
        },
      }),
    ).toThrow(/release identity was not verified/iu)
  })

  it('rejects a trusted release record bound to another Worker version', () => {
    expect(() =>
      selectRollbackTargetInfo({
        deployments: [
          {
            created_on: '2026-09-30T12:00:00.000Z',
            versions: [{ version_id: 'selected-version', percentage: 100 }],
          },
        ],
        version: {
          id: 'selected-version',
          annotations: {
            'workers/tag': 'v2026.09.30.1',
            'workers/message': `DINA v2026.09.30.1 (${verifiedReleaseCommit})`,
          },
        },
        legacyVersionIds: [],
        verifiedReleaseBindings: {
          'v2026.09.30.1': {
            commitSha: verifiedReleaseCommit,
            cloudflareVersionId: 'different-version',
          },
        },
      }),
    ).toThrow(/release identity was not verified/iu)
  })

  it('rejects a release message whose commit differs from the verified tag', () => {
    const mismatchedCommit = 'b'.repeat(40)
    expect(() =>
      selectRollbackTargetInfo({
        deployments: [
          {
            created_on: '2026-09-30T12:00:00.000Z',
            versions: [{ version_id: 'mismatched-version', percentage: 100 }],
          },
        ],
        version: {
          id: 'mismatched-version',
          annotations: {
            'workers/tag': 'v2026.09.30.1',
            'workers/message': `DINA v2026.09.30.1 (${mismatchedCommit})`,
          },
        },
        legacyVersionIds: [],
        verifiedReleaseBindings: {
          'v2026.09.30.1': {
            commitSha: verifiedReleaseCommit,
            cloudflareVersionId: 'mismatched-version',
          },
        },
      }),
    ).toThrow(/release identity was not verified/iu)
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
