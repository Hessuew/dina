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
  resolveTerms: Array<string>
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
    expect(workflow.resolveTerms).toEqual(
      expect.arrayContaining([
        "github.event_name == 'workflow_dispatch'",
        "github.event.workflow_run.event == 'push'",
        "github.event.workflow_run.conclusion == 'success'",
        "github.event.workflow_run.head_branch == 'main'",
      ]),
    )
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
    const terms = String(workflow.jobs.resolve.if)
      .replaceAll('$' + '{{', '')
      .replaceAll('}' + '}', '')
      .split(/\\|\\||&&|[()]/u)
      .map((term) => term.trim())
      .filter(Boolean)
    const rollback = workflow.jobs.deploy.steps.find(
      (step) => step.name === 'Re-run health smoke after rollback',
    )
    console.log(JSON.stringify({
      workflowRun: workflow.on.workflow_run,
      resolveTerms: terms,
      rollbackRun: rollback?.run,
      rollbackEnv: rollback?.env,
    }))
  `
  const { stdout } = await execFileAsync('bun', ['-e', script, workflowPath])
  return JSON.parse(stdout) as ParsedWorkflow
}
