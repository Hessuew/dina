const RELEASE_TAG_PATTERN = /^v\d{4}\.\d{2}\.\d{2}\.\d+$/u

function isReleaseTag(value) {
  return typeof value === 'string' && RELEASE_TAG_PATTERN.test(value)
}

function parseTrustedReleaseBinding(release, tagCommit, provenance = {}) {
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
  const productionRunMatch = /- Production workflow run: `(\d+)`/u.exec(body)
  if (
    !commitMatch ||
    !versionMatch ||
    !productionRunMatch ||
    typeof tagCommit !== 'string'
  ) {
    return null
  }

  const commitSha = commitMatch[1]
  if (tagCommit.trim().toLowerCase() !== commitSha) return null

  const mainGateRuns = Array.isArray(provenance?.mainGateRuns)
    ? provenance.mainGateRuns
    : []
  const productionRuns = Array.isArray(provenance?.productionRuns)
    ? provenance.productionRuns
    : []
  if (
    !mainGateRuns.some(
      (run) =>
        run?.conclusion === 'success' &&
        run?.head_branch === 'main' &&
        typeof run?.head_sha === 'string' &&
        run.head_sha.trim().toLowerCase() === commitSha,
    )
  ) {
    return null
  }

  const productionRun = productionRuns.find(
    (run) =>
      String(run?.id) === productionRunMatch[1] &&
      run?.conclusion === 'success' &&
      run?.head_branch === 'main' &&
      run?.display_title === `Production release ${commitSha}`,
  )
  if (!productionRun || !isWorkflowOwnedRelease(release, productionRun)) {
    return null
  }

  return {
    commitSha,
    cloudflareVersionId: versionMatch[1],
  }
}

function isWorkflowOwnedRelease(release, productionRun) {
  if (release.author?.login !== 'github-actions[bot]') return false
  const publishedAt = Date.parse(release.published_at)
  const startedAt = Date.parse(productionRun.run_started_at)
  const updatedAt = Date.parse(productionRun.updated_at)
  return (
    Number.isFinite(publishedAt) &&
    Number.isFinite(startedAt) &&
    Number.isFinite(updatedAt) &&
    publishedAt >= startedAt &&
    publishedAt <= updatedAt
  )
}

module.exports = { isReleaseTag, parseTrustedReleaseBinding }
