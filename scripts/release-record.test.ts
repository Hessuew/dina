import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { isReleaseTag, parseTrustedReleaseBinding } =
  require('./release-record.cjs') as {
    isReleaseTag: (value: unknown) => boolean
    parseTrustedReleaseBinding: (
      release: unknown,
      tagCommit: unknown,
      provenance: unknown,
    ) => { commitSha: string; cloudflareVersionId: string } | null
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
  it('accepts a release whose tag resolves to its recorded commit', () => {
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

  it('accepts only immutable release tag shapes', () => {
    expect(isReleaseTag('v2026.09.30.1')).toBe(true)
    expect(isReleaseTag('canary')).toBe(false)
  })
})
