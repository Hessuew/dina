const RELEASE_TAG_PATTERN = /^v\d{4}\.\d{2}\.\d{2}\.\d+$/u

function isReleaseTag(value) {
  return typeof value === 'string' && RELEASE_TAG_PATTERN.test(value)
}

function parseTrustedReleaseBinding(release, tagCommit) {
  if (
    !release ||
    release.draft ||
    release.prerelease ||
    !isReleaseTag(release.tag_name)
  ) {
    return null
  }

  const body = typeof release.body === 'string' ? release.body : ''
  const commitMatch = /- Validated main SHA: `([0-9a-f]{40})`/u.exec(body)
  const versionMatch = /- Cloudflare version: `([A-Za-z0-9._-]+)`/u.exec(body)
  if (!commitMatch || !versionMatch || typeof tagCommit !== 'string') {
    return null
  }

  if (tagCommit.trim().toLowerCase() !== commitMatch[1]) return null
  return {
    commitSha: commitMatch[1],
    cloudflareVersionId: versionMatch[1],
  }
}

module.exports = { isReleaseTag, parseTrustedReleaseBinding }
