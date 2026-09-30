import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { isReleaseTag, parseTrustedReleaseBinding } =
  require('./release-record.cjs') as {
    isReleaseTag: (value: unknown) => boolean
    parseTrustedReleaseBinding: (
      release: unknown,
      tagCommit: unknown,
    ) => { commitSha: string; cloudflareVersionId: string } | null
  }

const commitSha = 'a'.repeat(40)
const release = {
  tag_name: 'v2026.09.30.1',
  body: `# v2026.09.30.1\n\n- Validated main SHA: \`${commitSha}\`\n- Cloudflare version: \`version-1\``,
  draft: false,
  prerelease: false,
}

describe('parseTrustedReleaseBinding', () => {
  it('accepts a release whose tag resolves to its recorded commit', () => {
    expect(parseTrustedReleaseBinding(release, commitSha)).toEqual({
      commitSha,
      cloudflareVersionId: 'version-1',
    })
  })

  it('rejects a moved tag that resolves to another commit', () => {
    expect(parseTrustedReleaseBinding(release, 'b'.repeat(40))).toBeNull()
  })

  it('rejects a release without the trusted Worker binding', () => {
    expect(
      parseTrustedReleaseBinding(
        { ...release, body: `- Validated main SHA: \`${commitSha}\`` },
        commitSha,
      ),
    ).toBeNull()
  })

  it('accepts only immutable release tag shapes', () => {
    expect(isReleaseTag('v2026.09.30.1')).toBe(true)
    expect(isReleaseTag('canary')).toBe(false)
  })
})
