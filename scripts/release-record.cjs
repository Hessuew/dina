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
  const commitMatch = /- Validated main SHA: `([0-9a-f]{40})`/iu.exec(body)
  const productionRunMatch = /- Production workflow run: `(\d+)`/u.exec(body)
  if (!commitMatch || !productionRunMatch || typeof tagCommit !== 'string') {
    return null
  }

  const commitSha = commitMatch[1].toLowerCase()
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
      readProductionRunCommit(run?.display_title) === commitSha,
  )
  if (!productionRun || !isWorkflowOwnedRelease(release, productionRun)) {
    return null
  }

  const deployments = Array.isArray(provenance?.deployments)
    ? provenance.deployments
    : []
  const deployment = deployments.find((candidate) =>
    isTrustedDeployment(
      candidate,
      release.tag_name,
      commitSha,
      productionRunMatch[1],
      productionRun,
    ),
  )
  if (!deployment) return null

  return {
    commitSha,
    cloudflareVersionId: deployment.payload.cloudflareVersionId,
  }
}

function readProductionRunCommit(value) {
  if (typeof value !== 'string') return null
  const match = /^Production release\s+([0-9a-f]{40})$/iu.exec(value.trim())
  return match?.[1].toLowerCase() ?? null
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

function isTrustedDeployment(
  deployment,
  releaseTag,
  commitSha,
  productionRunId,
  productionRun,
) {
  if (
    !deployment ||
    deployment.ref !== releaseTag ||
    deployment.environment !== 'production' ||
    deployment.production_environment !== true ||
    deployment.sha?.trim().toLowerCase() !== commitSha ||
    deployment.creator?.login !== 'github-actions[bot]' ||
    !isWithinWorkflowRun(deployment.created_at, productionRun)
  ) {
    return null
  }
  const payload = deployment.payload
  const versionId = payload?.cloudflareVersionId
  if (
    !payload ||
    String(payload.productionRunId) !== productionRunId ||
    payload.releaseTag !== releaseTag ||
    typeof payload.commitSha !== 'string' ||
    payload.commitSha.trim().toLowerCase() !== commitSha ||
    typeof versionId !== 'string' ||
    !/^[A-Za-z0-9._-]+$/u.test(versionId)
  ) {
    return null
  }
  const statuses = Array.isArray(deployment.statuses) ? deployment.statuses : []
  if (
    !statuses.some(
      (status) =>
        status?.state === 'success' &&
        status?.environment === 'production' &&
        status?.creator?.login === 'github-actions[bot]',
    )
  ) {
    return null
  }
  return true
}

function isWithinWorkflowRun(value, productionRun) {
  const timestamp = Date.parse(value)
  const startedAt = Date.parse(productionRun.run_started_at)
  const updatedAt = Date.parse(productionRun.updated_at)
  return (
    Number.isFinite(timestamp) &&
    Number.isFinite(startedAt) &&
    Number.isFinite(updatedAt) &&
    timestamp >= startedAt &&
    timestamp <= updatedAt
  )
}

module.exports = { isReleaseTag, parseTrustedReleaseBinding }
