import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const {
  isReleaseTag,
  parseTrustedReleaseBinding,
  selectTrustedPreviousRelease,
} = require('./release-record.cjs') as {
  isReleaseTag: (value: unknown) => boolean
  parseTrustedReleaseBinding: (
    release: unknown,
    tagCommit: unknown,
    provenance: unknown,
  ) => { commitSha: string; cloudflareVersionId: string } | null
  selectTrustedPreviousRelease: (
    releases: unknown,
    previousReleaseTag: unknown,
  ) => unknown
}

const commitSha = 'a'.repeat(40)
const provenance = {
  mainGateRuns: [
    { conclusion: 'success', head_branch: 'main', head_sha: commitSha },
  ],
  productionRuns: [
    {
      id: 42,
      conclusion: 'success',
      head_branch: 'main',
      display_title: `Production release ${commitSha}`,
      run_started_at: '2026-09-30T10:00:00.000Z',
      updated_at: '2026-09-30T11:00:00.000Z',
    },
  ],
  deployments: [
    {
      ref: 'v2026.09.30.1',
      sha: commitSha,
      environment: 'production',
      production_environment: true,
      creator: { login: 'github-actions[bot]' },
      created_at: '2026-09-30T10:40:00.000Z',
      payload: {
        releaseTag: 'v2026.09.30.1',
        commitSha,
        cloudflareVersionId: 'version-1',
        productionRunId: '42',
      },
      statuses: [
        {
          state: 'success',
          environment: 'production',
          creator: { login: 'github-actions[bot]' },
          created_at: '2026-09-30T10:45:00.000Z',
        },
      ],
    },
  ],
}
const release = {
  tag_name: 'v2026.09.30.1',
  body: `# v2026.09.30.1\n\n- Validated main SHA: \`${commitSha}\`\n- Cloudflare version: \`version-1\`\n- Production workflow run: \`42\``,
  draft: false,
  prerelease: false,
  author: { login: 'github-actions[bot]' },
  published_at: '2026-09-30T10:30:00.000Z',
}

describe('parseTrustedReleaseBinding', () => {
  it('accepts a workflow-owned release whose deployment binds its version', () => {
    expect(parseTrustedReleaseBinding(release, commitSha, provenance)).toEqual({
      commitSha,
      cloudflareVersionId: 'version-1',
    })
  })

  it('rejects a moved tag that resolves to another commit', () => {
    expect(
      parseTrustedReleaseBinding(release, 'b'.repeat(40), provenance),
    ).toBeNull()
  })

  it('rejects a release without the trusted Worker binding', () => {
    expect(
      parseTrustedReleaseBinding(
        { ...release, body: `- Validated main SHA: \`${commitSha}\`` },
        commitSha,
        provenance,
      ),
    ).toBeNull()
  })

  it('rejects a release without a successful main gate for its commit', () => {
    expect(
      parseTrustedReleaseBinding(release, commitSha, {
        ...provenance,
        mainGateRuns: [],
      }),
    ).toBeNull()
  })

  it('rejects a release without a successful production workflow run', () => {
    expect(
      parseTrustedReleaseBinding(release, commitSha, {
        ...provenance,
        productionRuns: [],
      }),
    ).toBeNull()
  })

  it('normalizes a padded uppercase production run title', () => {
    expect(
      parseTrustedReleaseBinding(release, commitSha, {
        ...provenance,
        productionRuns: [
          {
            ...provenance.productionRuns[0],
            display_title: `Production release  ${commitSha.toUpperCase()} `,
          },
        ],
      }),
    ).toEqual({
      commitSha,
      cloudflareVersionId: 'version-1',
    })
  })

  it('rejects a manually authored release with matching body fields', () => {
    expect(
      parseTrustedReleaseBinding(
        { ...release, author: { login: 'release-manager' } },
        commitSha,
        provenance,
      ),
    ).toBeNull()
  })

  it('rejects a production run whose system title names another commit', () => {
    expect(
      parseTrustedReleaseBinding(release, commitSha, {
        ...provenance,
        productionRuns: [
          {
            ...provenance.productionRuns[0],
            display_title: 'Production release ' + 'b'.repeat(40),
          },
        ],
      }),
    ).toBeNull()
  })

  it('takes the version ID from immutable deployment evidence', () => {
    expect(
      parseTrustedReleaseBinding(
        {
          ...release,
          body: release.body.replace('version-1', 'tampered-version'),
        },
        commitSha,
        provenance,
      ),
    ).toMatchObject({ cloudflareVersionId: 'version-1' })
  })

  it('rejects a release without a matching successful deployment binding', () => {
    expect(
      parseTrustedReleaseBinding(release, commitSha, {
        ...provenance,
        deployments: [
          {
            ...provenance.deployments[0],
            payload: {
              ...provenance.deployments[0].payload,
              productionRunId: '43',
            },
          },
        ],
      }),
    ).toBeNull()
  })

  it.each(['failure', 'error', 'inactive', 'cancelled'])(
    'rejects a deployment with a later %s status',
    (state) => {
      expect(
        parseTrustedReleaseBinding(release, commitSha, {
          ...provenance,
          deployments: [
            {
              ...provenance.deployments[0],
              statuses: [
                ...provenance.deployments[0].statuses,
                {
                  created_at: '2026-09-30T10:50:00.000Z',
                  creator: { login: 'github-actions[bot]' },
                  environment: 'production',
                  state,
                },
              ],
            },
          ],
        }),
      ).toBeNull()
    },
  )

  it('accepts only immutable release tag shapes', () => {
    expect(isReleaseTag('v2026.09.30.1')).toBe(true)
    expect(isReleaseTag('canary')).toBe(false)
  })

  it('selects only the trusted previous release tag', () => {
    const trusted = {
      draft: false,
      prerelease: false,
      tag_name: 'v2026.09.29.1',
    }
    expect(
      selectTrustedPreviousRelease(
        [
          { draft: false, prerelease: false, tag_name: 'v2026.09.28.1' },
          trusted,
        ],
        trusted.tag_name,
      ),
    ).toEqual(trusted)
  })

  it('rejects missing, prerelease, and unrelated previous release history', () => {
    const history = [
      { draft: false, prerelease: true, tag_name: 'v2026.09.29.1' },
      { draft: false, prerelease: false, tag_name: 'v2026.09.28.1' },
    ]

    expect(selectTrustedPreviousRelease(history, '')).toBeNull()
    expect(selectTrustedPreviousRelease(history, 'v2026.09.29.1')).toBeNull()
    expect(selectTrustedPreviousRelease(history, 'v2026.09.30.1')).toBeNull()
  })
})
