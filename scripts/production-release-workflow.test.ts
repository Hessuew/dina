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
  resolveOutputs: Record<string, string>
  resolveCondition: string
  resolveEnv: Record<string, string>
  deployEnvironment: string | undefined
  trustedReleaseUses: string | undefined
  tagProtectionUses: string | undefined
  manualTargetVerificationUses: string | undefined
  affinityReadinessRun: string | undefined
  preflightEnv: Record<string, string> | undefined
  rollbackRun: string | undefined
  rollbackEnv: Record<string, string> | undefined
  deployEnv: Record<string, string>
  deployInstallEnv: Record<string, string> | undefined
  buildEnv: Record<string, string> | undefined
  deployToolingCheckoutRef: string | undefined
  deployTargetCheckout: Record<string, string> | undefined
  targetInstallWorkingDirectory: string | undefined
  buildWorkingDirectory: string | undefined
  buildRun: string | undefined
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
    expect(workflow.affinityReadinessRun).toContain(
      'scripts/release-policy.ts affinity-readiness',
    )
    expect(workflow.resolveOutputs.tooling_sha).toBe(
      '${{ steps.identity.outputs.tooling_sha }}',
    )
    expect(workflow.deployToolingCheckoutRef).toBe(
      '${{ needs.resolve.outputs.tooling_sha }}',
    )
    expect(workflow.deployTargetCheckout).toMatchObject({
      path: 'target',
      ref: '${{ needs.resolve.outputs.target_sha }}',
    })
    expect(workflow.resolveEnv.CLOUDFLARE_VERSION_AFFINITY_READY).toBe(
      "${{ vars.CLOUDFLARE_VERSION_AFFINITY_READY || 'false' }}",
    )
    expect(workflow.resolveEnv.CLOUDFLARE_VERSION_AFFINITY_EVIDENCE_URL).toBe(
      '${{ vars.CLOUDFLARE_VERSION_AFFINITY_EVIDENCE_URL }}',
    )
    expect(workflow.preflightEnv?.TRUSTED_RELEASE_BINDINGS).toBe(
      '${{ steps.trusted_releases.outputs.bindings }}',
    )
  })

  it('keeps provider identities aligned across deployment and runtime', async () => {
    const workflow = await readWorkflow()

    expect(workflow.deployEnvironment).toBe('production')
    expect(workflow.deployEnv.CLOUDFLARE_API_TOKEN).toBeUndefined()
    expect(workflow.deployEnv.CLOUDFLARE_ACCOUNT_ID).toBeUndefined()
    expect(workflow.deployEnv.SENTRY_AUTH_TOKEN).toBeUndefined()
    expect(workflow.deployEnv.CLOUDFLARE_VERSION_METRICS_TOKEN).toBeUndefined()
    expect(workflow.deployEnv.PRODUCTION_RELEASE_EVIDENCE_TOKEN).toBeUndefined()
    expect(workflow.deployInstallEnv).toBeUndefined()
    expect(workflow.buildEnv?.SENTRY_AUTH_TOKEN).toBeUndefined()
    expect(workflow.buildEnv?.RELEASE_SOURCE_MAPS_ENABLED).toBe('true')
    expect(workflow.targetInstallWorkingDirectory).toBe('target')
    expect(workflow.buildWorkingDirectory).toBe('target')
    expect(workflow.buildRun).toContain('--outDir ../dist')
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
      CLOUDFLARE_API_TOKEN: '${{ secrets.CLOUDFLARE_API_TOKEN }}',
      CLOUDFLARE_ACCOUNT_ID: '${{ secrets.CLOUDFLARE_ACCOUNT_ID }}',
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
    const affinityReadiness = workflow.jobs.resolve.steps.find(
      (step) => step.name === 'Verify Cloudflare version-affinity readiness',
    )
    const preflight = workflow.jobs.deploy.steps.find(
      (step) => step.id === 'preflight',
    )
    const build = workflow.jobs.deploy.steps.find(
      (step) =>
        step.name ===
        'Build the tagged production artifact and upload source maps',
    )
    const deployCheckouts = workflow.jobs.deploy.steps.filter(
      (step) => step.uses === 'actions/checkout@v4',
    )
    const targetInstall = workflow.jobs.deploy.steps.find(
      (step) => step.name === 'Install target application dependencies',
    )
    const deployInstall = workflow.jobs.deploy.steps.find(
      (step) => step.run === 'bun install --frozen-lockfile',
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
      resolveOutputs: workflow.jobs.resolve.outputs,
      resolveCondition: String(workflow.jobs.resolve.if),
      resolveEnv: workflow.jobs.resolve.env,
      deployEnvironment: workflow.jobs.deploy.environment,
      trustedReleaseUses: trustedReleases?.uses,
      tagProtectionUses: tagProtection?.uses,
      manualTargetVerificationUses: manualTargetVerification?.uses,
      affinityReadinessRun: affinityReadiness?.run,
      preflightEnv: preflight?.env,
      rollbackRun: rollback?.run,
      rollbackEnv: rollback?.env,
      deployEnv: workflow.jobs.deploy.env,
      deployInstallEnv: deployInstall?.env,
      buildEnv: build?.env,
      deployToolingCheckoutRef: deployCheckouts[0]?.with?.ref,
      deployTargetCheckout: deployCheckouts[1]?.with,
      targetInstallWorkingDirectory: targetInstall?.['working-directory'],
      buildWorkingDirectory: build?.['working-directory'],
      buildRun: build?.run,
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
