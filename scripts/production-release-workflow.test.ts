import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
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

    expect(workflow.rollbackRun).toBe('bun run smoke:health')
    expect(workflow.rollbackEnv).toMatchObject({
      SMOKE_BASE_URL: '${{ env.PRODUCTION_ORIGIN }}',
      SMOKE_VERSION_ID: '${{ steps.preflight.outputs.previous_version_id }}',
      SMOKE_WORKER_NAME: '${{ env.WORKER_NAME }}',
    })
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
    console.log(JSON.stringify({
      workflowRun: workflow.on.workflow_run,
      resolveCondition: String(workflow.jobs.resolve.if),
      rollbackRun: rollback?.run,
      rollbackEnv: rollback?.env,
    }))
  `
  const { stdout } = await execFileAsync('bun', ['-e', script, workflowPath])
  return JSON.parse(stdout) as ParsedWorkflow
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
