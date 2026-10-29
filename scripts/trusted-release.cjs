const {
  isReleaseTag,
  parseTrustedReleaseBinding,
} = require('./release-record.cjs')

async function collectTrustedReleaseBindings({
  releases,
  mainGateRuns,
  productionRuns,
  deployments,
  getTagCommit,
}) {
  const bindings = {}
  for (const release of Array.isArray(releases) ? releases : []) {
    if (!isReleaseTag(release?.tag_name)) continue
    let tagCommit
    try {
      tagCommit = await getTagCommit(release.tag_name)
    } catch {
      continue
    }
    const binding = parseTrustedReleaseBinding(release, tagCommit, {
      mainGateRuns,
      productionRuns,
      deployments,
    })
    if (binding) bindings[release.tag_name] = binding
  }
  return bindings
}

async function loadTrustedReleaseBindings(github, repository) {
  const { owner, repo } = repository ?? {}
  const [releases, mainGateRuns, productionRuns, deployments] =
    await Promise.all([
      github.paginate(github.rest.repos.listReleases, {
        owner,
        repo,
        per_page: 100,
      }),
      listMainWorkflowRuns(github, owner, repo, 'main-release.yml'),
      listMainWorkflowRuns(github, owner, repo, 'production-release.yml'),
      listDeploymentsWithStatuses(github, owner, repo),
    ])
  return collectTrustedReleaseBindings({
    releases,
    mainGateRuns,
    productionRuns,
    deployments,
    getTagCommit: (tagName) => getTagCommit(github, owner, repo, tagName),
  })
}

function listMainWorkflowRuns(github, owner, repo, workflowId) {
  return github.paginate(github.rest.actions.listWorkflowRuns, {
    owner,
    repo,
    workflow_id: workflowId,
    branch: 'main',
    status: 'completed',
    per_page: 100,
  })
}

async function listDeploymentsWithStatuses(github, owner, repo) {
  const deployments = await github.paginate(github.rest.repos.listDeployments, {
    owner,
    repo,
    environment: 'production',
    per_page: 100,
  })
  return Promise.all(
    deployments.map(async (deployment) => ({
      ...deployment,
      statuses: await github.paginate(
        github.rest.repos.listDeploymentStatuses,
        { owner, repo, deployment_id: deployment.id, per_page: 100 },
      ),
    })),
  )
}

async function getTagCommit(github, owner, repo, tagName) {
  const reference = await github.rest.git.getRef({
    owner,
    repo,
    ref: `tags/${tagName}`,
  })
  let object = reference.data.object
  while (object.type === 'tag') {
    const tag = await github.rest.git.getTag({
      owner,
      repo,
      tag_sha: object.sha,
    })
    object = tag.data.object
  }
  if (object.type !== 'commit') {
    throw new Error(`Tag ${tagName} does not resolve to a commit`)
  }
  return object.sha
}

function isSupportedManualPromotionTarget(targetSha, currentMainSha, bindings) {
  const target = normalizeSha(targetSha)
  const currentMain = normalizeSha(currentMainSha)
  if (!target || !currentMain) return false
  if (target === currentMain) return true
  return Object.values(bindings ?? {}).some(
    (binding) => normalizeSha(binding?.commitSha) === target,
  )
}

function normalizeSha(value) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return /^[0-9a-f]{40}$/u.test(normalized) ? normalized : null
}

module.exports = {
  collectTrustedReleaseBindings,
  isSupportedManualPromotionTarget,
  loadTrustedReleaseBindings,
}
