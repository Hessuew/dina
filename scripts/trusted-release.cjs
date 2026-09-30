const {
  isReleaseTag,
  parseTrustedReleaseBinding,
} = require('./release-record.cjs')

async function loadTrustedReleaseBindings(github, { owner, repo }) {
  const releases = await github.paginate(github.rest.repos.listReleases, {
    owner,
    repo,
    per_page: 100,
  })
  const [mainGateRuns, productionRuns] = await Promise.all([
    github.paginate(github.rest.actions.listWorkflowRuns, {
      owner,
      repo,
      workflow_id: 'main-release.yml',
      branch: 'main',
      status: 'completed',
      per_page: 100,
    }),
    github.paginate(github.rest.actions.listWorkflowRuns, {
      owner,
      repo,
      workflow_id: 'production-release.yml',
      branch: 'main',
      status: 'completed',
      per_page: 100,
    }),
  ])
  const releaseTags = new Set(
    releases
      .filter((release) => isReleaseTag(release.tag_name))
      .map((release) => release.tag_name),
  )
  const deployments = await github.paginate(github.rest.repos.listDeployments, {
    owner,
    repo,
    environment: 'production',
    per_page: 100,
  })
  const deploymentRecords = await Promise.all(
    deployments
      .filter((deployment) => releaseTags.has(deployment.ref))
      .map(async (deployment) => ({
        ...deployment,
        statuses: await github.paginate(
          github.rest.repos.listDeploymentStatuses,
          {
            owner,
            repo,
            deployment_id: deployment.id,
            per_page: 100,
          },
        ),
      })),
  )

  return collectTrustedReleaseBindings({
    releases,
    mainGateRuns,
    productionRuns,
    deployments: deploymentRecords,
    getTagCommit: async (tag) => {
      const response = await github.rest.repos.getCommit({
        owner,
        repo,
        ref: tag,
      })
      return response.data.sha
    },
  })
}

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
