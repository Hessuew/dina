import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

type ParsedWorkflow = {
  runName: string
  workflowRun: {
    workflows: Array<string>
    types: Array<string>
    branches: Array<string>
  }
  resolveCondition: string
  deployEnvironment: string | undefined
  trustedReleaseUses: string | undefined
  tagProtectionUses: string | undefined
  manualTargetVerificationUses: string | undefined
  preflightEnv: Record<string, string> | undefined
  rollbackRun: string | undefined
  rollbackEnv: Record<string, string> | undefined
  deployEnv: Record<string, string>
  journeyEnv: Record<string, string> | undefined
  uploadEnv: Record<string, string> | undefined
  healthRun: string | undefined
  journeyRun: string | undefined
  postRolloutHealthRun: string | undefined
  releasePublicationUses: string | undefined
  releasePublicationEnv: Record<string, string> | undefined
  releasePublicationIndex: number
  rollbackIndex: number
}

describe('production release workflow', () => {
  it('names each run with the exact promoted commit', async () => {
    const workflow = await readWorkflow()

    expect(workflow.runName).toBe(
      'Production release ${{ inputs.target_sha || github.event.workflow_run.head_sha }}',
    )
  })

  it('requires a successful push-triggered main gate for automatic promotion', async () => {
    const workflow = await readWorkflow()

    expect(workflow.workflowRun).toEqual({
      workflows: ['Main release gate'],
      types: ['completed'],
      branches: ['main'],
    })
    expect(
      evaluateCondition(workflow.resolveCondition, {
        event_name: 'workflow_run',
        workflow_run: {
          event: 'workflow_dispatch',
          conclusion: 'success',
          head_branch: 'main',
        },
      }),
    ).toBe(false)
    expect(
      evaluateCondition(workflow.resolveCondition, {
        event_name: 'workflow_run',
        workflow_run: {
          event: 'push',
          conclusion: 'success',
          head_branch: 'main',
        },
      }),
    ).toBe(true)
    expect(
      evaluateCondition(workflow.resolveCondition, {
        event_name: 'workflow_dispatch',
        ref: 'refs/heads/main',
      }),
    ).toBe(true)
    expect(
      evaluateCondition(workflow.resolveCondition, {
        event_name: 'workflow_dispatch',
        ref: 'refs/heads/feature/unsafe',
      }),
    ).toBe(false)
  })

  it('pins rollback smoke to the recorded previous Worker version', async () => {
    const workflow = await readWorkflow()

    expect(workflow.rollbackRun).toBe(
      'bun run scripts/retry-release-smoke.ts rollback',
    )
    expect(workflow.rollbackEnv).toMatchObject({
      ROLLBACK_VERSION_ID: '${{ steps.preflight.outputs.previous_version_id }}',
      ROLLBACK_WORKER_NAME: '${{ env.WORKER_NAME }}',
      ROLLBACK_RELEASE_TAG: '${{ env.RELEASE_TAG }}',
      SMOKE_BASE_URL: '${{ env.PRODUCTION_ORIGIN }}',
      SMOKE_VERSION_ID: '${{ steps.preflight.outputs.previous_version_id }}',
      SMOKE_WORKER_NAME: '${{ env.WORKER_NAME }}',
      SMOKE_LEGACY_TARGET: '${{ steps.preflight.outputs.legacy_compatible }}',
      SMOKE_EXPECTED_RELEASE:
        '${{ steps.preflight.outputs.previous_release_tag }}',
    })
  })

  it('sources rollback identity from trusted GitHub release bindings', async () => {
    const workflow = await readWorkflow()

    expect(workflow.trustedReleaseUses).toBe('actions/github-script@v7')
    expect(workflow.tagProtectionUses).toBe('actions/github-script@v7')
    expect(workflow.manualTargetVerificationUses).toBe(
      'actions/github-script@v7',
    )
    expect(workflow.preflightEnv?.TRUSTED_RELEASE_BINDINGS).toBe(
      '${{ steps.trusted_releases.outputs.bindings }}',
    )
  })

  it('keeps provider identities aligned across deployment and runtime', async () => {
    const workflow = await readWorkflow()

    expect(workflow.deployEnvironment).toBe('production')
    expect(workflow.deployEnv.CLOUDFLARE_ACCOUNT_ID).toBe(
      '${{ secrets.CLOUDFLARE_ACCOUNT_ID }}',
    )
    expect(workflow.deployEnv.PRODUCTION_JOURNEY_PATHS).toBe(
      '${{ vars.PRODUCTION_JOURNEY_PATHS }}',
    )
    expect(workflow.deployEnv.CLOUDFLARE_LEGACY_VERSION_IDS).toBe(
      '${{ vars.CLOUDFLARE_LEGACY_VERSION_IDS }}',
    )
    expect(workflow.deployEnv.SENTRY_PROJECT).toBe(
      '${{ vars.BETTER_STACK_APPLICATION_ID }}',
    )
    expect(workflow.deployEnv.BETTER_STACK_APPLICATION_ID).toBe(
      '${{ vars.BETTER_STACK_APPLICATION_ID }}',
    )
    expect(workflow.uploadEnv).toMatchObject({
      CLOUDFLARE_ACCOUNT_ID: '${{ env.CLOUDFLARE_ACCOUNT_ID }}',
      BETTER_STACK_APPLICATION_ID: '${{ env.BETTER_STACK_APPLICATION_ID }}',
      RELEASE_SHA: '${{ env.TARGET_SHA }}',
      RELEASE_ORIGIN: '${{ env.PRODUCTION_ORIGIN }}',
      RELEASE_SOURCE_MAPS_VERIFIED: 'true',
    })
  })

  it('retries exact-version smoke after the version override is deployed', async () => {
    const workflow = await readWorkflow()

    expect(workflow.healthRun).toBe(
      'bun run scripts/retry-release-smoke.ts health',
    )
    expect(workflow.journeyRun).toBe(
      'bun run scripts/retry-release-smoke.ts journey',
    )
    expect(workflow.journeyEnv?.PRODUCTION_JOURNEY_PATHS).toBe(
      '${{ env.PRODUCTION_JOURNEY_PATHS }}',
    )
    expect(workflow.postRolloutHealthRun).toBe(
      'bun run scripts/retry-release-smoke.ts health',
    )
  })

  it('keeps release publication inside the rollback scope', async () => {
    const workflow = await readWorkflow()

    expect(workflow.releasePublicationUses).toBe('actions/github-script@v7')
    expect(workflow.releasePublicationEnv?.PREVIOUS_RELEASE_TAG).toBe(
      '${{ steps.preflight.outputs.previous_release_tag }}',
    )
    expect(workflow.releasePublicationIndex).toBeLessThan(
      workflow.rollbackIndex,
    )
  })
})

async function readWorkflow(): Promise<ParsedWorkflow> {
  const workflowPath = new URL(
    '../.github/workflows/production-release.yml',
    import.meta.url,
  ).pathname
  const script = `
    const workflow = Bun.YAML.parse(await Bun.file(process.argv[1]).text())
    const trustedReleases = workflow.jobs.deploy.steps.find(
      (step) => step.id === 'trusted_releases',
    )
    const tagProtection = workflow.jobs.resolve.steps.find(
      (step) => step.name === 'Verify immutable v* tag protection',
    )
    const manualTargetVerification = workflow.jobs.resolve.steps.find(
      (step) => step.name === 'Verify manual target is current or previously trusted',
    )
    const preflight = workflow.jobs.deploy.steps.find(
      (step) => step.id === 'preflight',
    )
    const rollback = workflow.jobs.deploy.steps.find(
      (step) => step.name === 'Roll back the Worker after a failed smoke or guardrail',
    )
    const releasePublicationIndex = workflow.jobs.deploy.steps.findIndex(
      (step) => step.name === 'Publish GitHub Release evidence and deployment binding',
    )
    const rollbackIndex = workflow.jobs.deploy.steps.findIndex(
      (step) => step.name === 'Roll back the Worker after a failed smoke or guardrail',
    )
    const health = workflow.jobs.deploy.steps.find(
      (step) => step.name === 'Run exact-version health smoke',
    )
    const journey = workflow.jobs.deploy.steps.find(
      (step) => step.name === 'Run affected public journey smoke through the version override',
    )
    const postRolloutHealth = workflow.jobs.deploy.steps.find(
      (step) => step.name === 'Verify the promoted version after rollout',
    )
    const upload = workflow.jobs.deploy.steps.find(
      (step) => step.name === 'Upload an undeployed Cloudflare Worker version',
    )
    console.log(JSON.stringify({
      runName: workflow['run-name'],
      workflowRun: workflow.on.workflow_run,
      resolveCondition: String(workflow.jobs.resolve.if),
      deployEnvironment: workflow.jobs.deploy.environment,
      trustedReleaseUses: trustedReleases?.uses,
      tagProtectionUses: tagProtection?.uses,
      manualTargetVerificationUses: manualTargetVerification?.uses,
      preflightEnv: preflight?.env,
      rollbackRun: rollback?.run,
      rollbackEnv: rollback?.env,
      deployEnv: workflow.jobs.deploy.env,
      journeyEnv: journey?.env,
      uploadEnv: upload?.env,
      healthRun: health?.run,
      journeyRun: journey?.run,
      postRolloutHealthRun: postRolloutHealth?.run,
      releasePublicationUses: workflow.jobs.deploy.steps.find(
        (step) => step.name === 'Publish GitHub Release evidence and deployment binding',
      )?.uses,
      releasePublicationEnv: workflow.jobs.deploy.steps.find(
        (step) => step.name === 'Publish GitHub Release evidence and deployment binding',
      )?.env,
      releasePublicationIndex,
      rollbackIndex,
    }))
  `
  const { stdout } = await execFileAsync('bun', ['-e', script, workflowPath])
  return JSON.parse(stdout) as ParsedWorkflow
}

type WorkflowContext = {
  event_name: string
  ref?: string
  workflow_run?: {
    event?: string
    conclusion?: string
    head_branch?: string
  }
}

function evaluateCondition(
  expression: string,
  context: WorkflowContext,
): boolean {
  const normalized = expression
    .replaceAll('${{', '')
    .replaceAll('}}', '')
    .trim()
  const values = new Map<string, string | undefined>([
    ['github.event_name', context.event_name],
    ['github.ref', context.ref],
    ['github.event.workflow_run.event', context.workflow_run?.event],
    ['github.event.workflow_run.conclusion', context.workflow_run?.conclusion],
    [
      'github.event.workflow_run.head_branch',
      context.workflow_run?.head_branch,
    ],
  ])
  const comparisons = normalized.match(/[A-Za-z0-9._-]+\s*==\s*'[^']*'/gu)
  if (!comparisons) throw new Error('Workflow condition has no comparisons')
  let result = normalized
  for (const comparison of comparisons) {
    const match = /^([A-Za-z0-9._-]+)\s*==\s*'([^']*)'$/u.exec(comparison)
    if (!match)
      throw new Error(`Unsupported workflow comparison: ${comparison}`)
    result = result.replace(
      comparison,
      String(values.get(match[1]) === match[2]),
    )
  }
  return evaluateBooleanExpression(result)
}

function evaluateBooleanExpression(expression: string): boolean {
  const tokens = expression
    .replaceAll('(', ' ( ')
    .replaceAll(')', ' ) ')
    .trim()
    .split(/\s+/u)
  let index = 0

  function parseOr(): boolean {
    let value = parseAnd()
    while (tokens[index] === '||') {
      index += 1
      const right = parseAnd()
      value = value || right
    }
    return value
  }

  function parseAnd(): boolean {
    let value = parsePrimary()
    while (tokens[index] === '&&') {
      index += 1
      const right = parsePrimary()
      value = value && right
    }
    return value
  }

  function parsePrimary(): boolean {
    const token = tokens[index]
    if (token === '(') {
      index += 1
      const value = parseOr()
      if (tokens[index] !== ')')
        throw new Error('Unbalanced workflow condition')
      index += 1
      return value
    }
    if (token === 'true' || token === 'false') {
      index += 1
      return token === 'true'
    }
    throw new Error(`Unsupported workflow condition token: ${token}`)
  }

  const value = parseOr()
  if (index !== tokens.length)
    throw new Error('Unexpected workflow condition token')
  return value
}
