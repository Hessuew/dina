import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { collectTrustedReleaseBindings, isSupportedManualPromotionTarget } =
  require('./trusted-release.cjs') as {
    collectTrustedReleaseBindings: (
      input: unknown,
    ) => Promise<Record<string, unknown>>
    isSupportedManualPromotionTarget: (
      targetSha: unknown,
      currentMainSha: unknown,
      bindings: unknown,
    ) => boolean
  }

const commitSha = 'a'.repeat(40)
const releaseTag = 'v2026.09.30.1'
const release = {
  author: { login: 'github-actions[bot]' },
  body: `- Validated main SHA: \`${commitSha}\`\n- Production workflow run: \`42\``,
  draft: false,
  prerelease: false,
  published_at: '2026-09-30T10:30:00.000Z',
  tag_name: releaseTag,
}
const provenance = {
  deployments: [
    {
      created_at: '2026-09-30T10:40:00.000Z',
      creator: { login: 'github-actions[bot]' },
      environment: 'production',
      payload: {
        cloudflareVersionId: 'version-1',
        commitSha,
        productionRunId: '42',
        releaseTag,
      },
      production_environment: true,
      ref: releaseTag,
      sha: commitSha,
      statuses: [
        {
          creator: { login: 'github-actions[bot]' },
          environment: 'production',
          state: 'success',
        },
      ],
    },
  ],
  mainGateRuns: [
    { conclusion: 'success', head_branch: 'main', head_sha: commitSha },
  ],
  productionRuns: [
    {
      conclusion: 'success',
      display_title: `Production release ${commitSha}`,
      head_branch: 'main',
      id: 42,
      run_started_at: '2026-09-30T10:00:00.000Z',
      updated_at: '2026-09-30T11:00:00.000Z',
    },
  ],
}

describe('collectTrustedReleaseBindings', () => {
  it('skips stale release tags while retaining valid bindings', async () => {
    const staleTag = 'v2026.09.29.1'
    const bindings = await collectTrustedReleaseBindings({
      ...provenance,
      deployments: provenance.deployments,
      getTagCommit: async (tag: string) => {
        if (tag === staleTag) throw new Error('tag was deleted')
        return commitSha
      },
      releases: [{ ...release, tag_name: staleTag }, release],
    })

    expect(bindings).toEqual({
      [releaseTag]: {
        cloudflareVersionId: 'version-1',
        commitSha,
      },
    })
  })
})

describe('isSupportedManualPromotionTarget', () => {
  it('accepts the current main commit', () => {
    expect(isSupportedManualPromotionTarget(commitSha, commitSha, {})).toBe(
      true,
    )
  })

  it('accepts a commit from a trusted prior production release', () => {
    expect(
      isSupportedManualPromotionTarget(commitSha, 'b'.repeat(40), {
        [releaseTag]: { commitSha },
      }),
    ).toBe(true)
  })

  it('rejects an unsupported historical commit', () => {
    expect(
      isSupportedManualPromotionTarget('c'.repeat(40), 'b'.repeat(40), {
        [releaseTag]: { commitSha },
      }),
    ).toBe(false)
  })
})
