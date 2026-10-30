const { loadTrustedReleaseBindings } = require('./trusted-release.cjs')

const PREPRODUCTION_JOB_NAME = 'Deploy and verify pre-production'
const MAIN_GATE_WORKFLOW_ID = 'main-release.yml'
const MAIN_BRANCH = 'main'

function isSuccessfulPreproductionJob(job) {
  return job?.name === PREPRODUCTION_JOB_NAME && job?.conclusion === 'success'
}

async function runHasPreproductionEvidence(github, repository, runId) {
  const jobs = await github.paginate(
    github.rest.actions.listJobsForWorkflowRun,
    {
      owner: repository.owner,
      repo: repository.repo,
      run_id: runId,
      filter: 'latest',
      per_page: 100,
    },
  )
  return jobs.some(isSuccessfulPreproductionJob)
}

async function findGateRunWithPreproductionEvidence(
  github,
  repository,
  targetSha,
) {
  const runs = await github.paginate(github.rest.actions.listWorkflowRuns, {
    owner: repository.owner,
    repo: repository.repo,
    workflow_id: MAIN_GATE_WORKFLOW_ID,
    branch: MAIN_BRANCH,
    status: 'completed',
    per_page: 100,
  })
  const candidates = runs.filter(
    (run) =>
      typeof run?.head_sha === 'string' &&
      run.head_sha.toLowerCase() === targetSha &&
      run.conclusion === 'success',
  )
  for (const run of candidates) {
    if (await runHasPreproductionEvidence(github, repository, run.id)) {
      return run
    }
  }
  return null
}

function isTrustedReleaseCommit(targetSha, bindings) {
  return Object.values(bindings ?? {}).some(
    (binding) => normalizeSha(binding?.commitSha) === targetSha,
  )
}

async function isTrustedReleaseTarget(github, repository, targetSha) {
  const currentMain = await github.rest.repos.getBranch({
    owner: repository.owner,
    repo: repository.repo,
    branch: MAIN_BRANCH,
  })
  const currentSha = normalizeSha(currentMain.data?.commit?.sha)
  if (!currentSha || targetSha === currentSha) return false
  const bindings = await loadTrustedReleaseBindings(github, repository)
  return isTrustedReleaseCommit(targetSha, bindings)
}

async function verifyPreproductionGate(github, repository, options) {
  const targetSha = normalizeSha(options?.targetSha)
  if (!targetSha) {
    throw new Error('Pre-production gate requires a full target commit SHA')
  }
  const gateRunId = options?.gateRunId ? Number(options.gateRunId) : null

  if (gateRunId) {
    const found = await runHasPreproductionEvidence(
      github,
      repository,
      gateRunId,
    )
    if (!found) {
      throw new Error(
        `Main release gate run ${gateRunId} for ${targetSha} did not record a ` +
          `successful "${PREPRODUCTION_JOB_NAME}" job; pre-production evidence ` +
          'is required before production promotion.',
      )
    }
    return { source: 'gate-run', runId: gateRunId }
  }

  if (await isTrustedReleaseTarget(github, repository, targetSha)) {
    return { source: 'trusted-release' }
  }

  const run = await findGateRunWithPreproductionEvidence(
    github,
    repository,
    targetSha,
  )
  if (!run) {
    throw new Error(
      `No successful pre-production gate evidence was found for ${targetSha}. ` +
        'Re-run the Main release gate for that commit before promoting.',
    )
  }
  return { source: 'gate-run', runId: run.id }
}

function normalizeSha(value) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return /^[0-9a-f]{40}$/u.test(normalized) ? normalized : null
}

module.exports = {
  PREPRODUCTION_JOB_NAME,
  findGateRunWithPreproductionEvidence,
  isSuccessfulPreproductionJob,
  isTrustedReleaseCommit,
  runHasPreproductionEvidence,
  verifyPreproductionGate,
}
