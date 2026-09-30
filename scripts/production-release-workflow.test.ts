import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import shellQuote from 'shell-quote'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

type ParsedWorkflow = {
  workflowRun: {
    workflows: Array<string>
    types: Array<string>
    branches: Array<string>
  }
  resolveCondition: string
  rollbackRun: string | undefined
  rollbackEnv: Record<string, string> | undefined
  deployEnv: Record<string, string>
  uploadRun: string | undefined
  healthRun: string | undefined
  journeyRun: string | undefined
}

describe('production release workflow', () => {
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
      }),
    ).toBe(true)
  })

  it('pins rollback smoke to the recorded previous Worker version', async () => {
    const workflow = await readWorkflow()

    expect(workflow.rollbackRun).toBe('bun run scripts/rollback-smoke.ts')
    expect(workflow.rollbackEnv).toMatchObject({
      SMOKE_BASE_URL: '${{ env.PRODUCTION_ORIGIN }}',
      SMOKE_VERSION_ID: '${{ steps.preflight.outputs.previous_version_id }}',
      SMOKE_WORKER_NAME: '${{ env.WORKER_NAME }}',
      SMOKE_LEGACY_TARGET: '${{ steps.preflight.outputs.legacy_compatible }}',
    })
  })

  it('keeps provider identities aligned across deployment and runtime', async () => {
    const workflow = await readWorkflow()

    expect(workflow.deployEnv.CLOUDFLARE_ACCOUNT_ID).toBe(
      '${{ secrets.CLOUDFLARE_ACCOUNT_ID }}',
    )
    expect(workflow.deployEnv.SENTRY_PROJECT).toBe(
      '${{ vars.BETTER_STACK_APPLICATION_ID }}',
    )
    expect(workflow.deployEnv.BETTER_STACK_APPLICATION_ID).toBe(
      '${{ vars.BETTER_STACK_APPLICATION_ID }}',
    )
    expect(parseWranglerVars(workflow.uploadRun)).toMatchObject({
      CLOUDFLARE_ACCOUNT_ID: 'account-id',
      BETTER_STACK_APPLICATION_ID: 'application-id',
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
  })
})

async function readWorkflow(): Promise<ParsedWorkflow> {
  const workflowPath = new URL(
    '../.github/workflows/production-release.yml',
    import.meta.url,
  ).pathname
  const script = `
    const workflow = Bun.YAML.parse(await Bun.file(process.argv[1]).text())
    const rollback = workflow.jobs.deploy.steps.find(
      (step) => step.name === 'Re-run health smoke after rollback',
    )
    const health = workflow.jobs.deploy.steps.find(
      (step) => step.name === 'Run exact-version health smoke',
    )
    const journey = workflow.jobs.deploy.steps.find(
      (step) => step.name === 'Run affected public journey smoke through the version override',
    )
    const upload = workflow.jobs.deploy.steps.find(
      (step) => step.name === 'Upload an undeployed Cloudflare Worker version',
    )
    console.log(JSON.stringify({
      workflowRun: workflow.on.workflow_run,
      resolveCondition: String(workflow.jobs.resolve.if),
      rollbackRun: rollback?.run,
      rollbackEnv: rollback?.env,
      deployEnv: workflow.jobs.deploy.env,
      uploadRun: upload?.run,
      healthRun: health?.run,
      journeyRun: journey?.run,
    }))
  `
  const { stdout } = await execFileAsync('bun', ['-e', script, workflowPath])
  return JSON.parse(stdout) as ParsedWorkflow
}

function parseWranglerVars(run: string | undefined): Record<string, string> {
  const tokens = shellQuote
    .parse(run ?? '', {
      CLOUDFLARE_ACCOUNT_ID: 'account-id',
      BETTER_STACK_APPLICATION_ID: 'application-id',
    })
    .filter((token): token is string => typeof token === 'string')
  const vars: Record<string, string> = {}
  for (let index = 0; index < tokens.length - 1; index += 1) {
    if (tokens[index] !== '--var') continue
    const assignment = tokens[index + 1]
    const separator = assignment.indexOf(':')
    if (separator <= 0)
      throw new Error(`Invalid Wrangler variable: ${assignment}`)
    vars[assignment.slice(0, separator)] = assignment.slice(separator + 1)
    index += 1
  }
  return vars
}

type WorkflowContext = {
  event_name: string
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
