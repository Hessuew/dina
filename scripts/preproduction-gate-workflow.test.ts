import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { PREPRODUCTION_JOB_NAME } from './preproduction-gate.cjs'

const execFileAsync = promisify(execFile)

type GateJob = {
  name?: string
  needs?: Array<string> | string
  if?: string
  environment?: string
  outputs?: Record<string, string>
  env?: Record<string, string>
  steps?: Array<{
    id?: string
    name?: string
    uses?: string
    if?: string
    env?: Record<string, string>
    run?: string
    with?: Record<string, unknown>
  }>
}

type ParsedWorkflows = {
  preproduction: GateJob
  gateJobIndex: number
  resolveStepNames: Array<string>
  evidenceStepIndex: number
  identityStepIndex: number
  evidenceScript: string
  evidenceEnv: Record<string, string>
  journeyEnv: Record<string, string>
}

async function readWorkflows(): Promise<ParsedWorkflows> {
  const script = `
    const main = Bun.YAML.parse(await Bun.file('.github/workflows/main-release.yml').text())
    const production = Bun.YAML.parse(await Bun.file('.github/workflows/production-release.yml').text())
    const jobNames = Object.keys(main.jobs)
    const resolveSteps = production.jobs.resolve.steps
    const evidenceIndex = resolveSteps.findIndex((step) => step.name === 'Verify pre-production gate evidence for the target SHA')
    const identityIndex = resolveSteps.findIndex((step) => step.id === 'identity')
    const evidence = resolveSteps[evidenceIndex] ?? {}
    const deploySteps = production.jobs.deploy.steps
    const journey = deploySteps.find((step) => step.name === 'Run affected public journey smoke through the version override') ?? {}
    console.log(JSON.stringify({
      preproduction: main.jobs.preproduction,
      gateJobIndex: jobNames.indexOf('preproduction'),
      resolveStepNames: resolveSteps.map((step) => step.name ?? step.id ?? ''),
      evidenceStepIndex: evidenceIndex,
      identityStepIndex: identityIndex,
      evidenceScript: String(evidence.with?.script ?? ''),
      evidenceEnv: evidence.env ?? {},
      journeyEnv: journey.env ?? {},
    }))
  `
  const { stdout } = await execFileAsync('bun', ['-e', script])
  return JSON.parse(stdout) as ParsedWorkflows
}

function steps(job: GateJob | undefined) {
  return job?.steps ?? []
}

function stepByName(job: GateJob | undefined, name: string) {
  return steps(job).find((step) => step.name === name)
}

describe('pre-production gate workflow semantics', () => {
  it('runs an isolated pre-production deployment job inside the main release gate', async () => {
    const { preproduction, gateJobIndex } = await readWorkflows()

    expect(gateJobIndex).toBeGreaterThanOrEqual(0)
    expect(preproduction.name).toBe(PREPRODUCTION_JOB_NAME)
    expect(preproduction.environment).toBe('pre-production')
    expect(preproduction.needs).toEqual(['release', 'migrate-development'])
  })

  it('stays fail-closed behind the protected gate switch and release result', async () => {
    const { preproduction } = await readWorkflows()
    const condition = String(preproduction.if ?? '')

    expect(condition).toContain('always()')
    expect(condition).toContain("needs.release.result == 'success'")
    expect(condition).toContain("needs.migrate-development.result != 'failure'")
    expect(condition).toContain("vars.PREPRODUCTION_GATE_ENABLED == 'true'")
  })

  it('binds the pre-production tag and smoke expectations to the gated SHA', async () => {
    const { preproduction } = await readWorkflows()
    const identity = stepByName(
      preproduction,
      'Validate pre-production isolation inputs',
    )
    const health = stepByName(
      preproduction,
      'Run pre-production health and readiness smoke',
    )
    const journey = stepByName(
      preproduction,
      'Run the agreed public journeys through pre-production',
    )

    expect(identity?.run).toContain('git rev-parse HEAD')
    expect(identity?.run).toContain('tag=pre-$target_sha')
    expect(health?.env?.SMOKE_EXPECTED_RELEASE).toBe(
      '${{ steps.identity.outputs.tag }}',
    )
    expect(health?.env?.SMOKE_EXPECTED_VERSION_ID).toBe(
      '${{ steps.upload.outputs.version_id }}',
    )
    expect(journey?.env?.SMOKE_EXPECTED_RELEASE).toBe(
      '${{ steps.identity.outputs.tag }}',
    )
    expect(journey?.env?.SMOKE_JOURNEY_PATHS).toBe(
      '${{ env.PREPRODUCTION_JOURNEY_PATHS }}',
    )
  })

  it('requires health, readiness, and the agreed public journeys through the isolated worker', async () => {
    const { preproduction } = await readWorkflows()
    const health = stepByName(
      preproduction,
      'Run pre-production health and readiness smoke',
    )
    const journey = stepByName(
      preproduction,
      'Run the agreed public journeys through pre-production',
    )

    expect(health?.run).toContain('retry-release-smoke.ts health')
    expect(health?.env?.SMOKE_BASE_URL).toBe('${{ env.PREPRODUCTION_ORIGIN }}')
    expect(journey?.run).toContain('retry-release-smoke.ts journey')
    expect(journey?.env?.SMOKE_BASE_URL).toBe('${{ env.PREPRODUCTION_ORIGIN }}')
  })

  it('never reuses production names, origins, or the production Supabase project', async () => {
    const { preproduction } = await readWorkflows()
    const identity = stepByName(
      preproduction,
      'Validate pre-production isolation inputs',
    )
    const jobEnv = Object.keys(preproduction.env ?? {})

    expect(preproduction.env?.PREPRODUCTION_WORKER_NAME).toContain(
      'christ-dina-preproduction',
    )
    expect(identity?.run).toContain('christ-dina.org')
    expect(identity?.run).toContain('SUPABASE_PRODUCTION_PROJECT_REF')
    expect(jobEnv).not.toContain('DATABASE_URL')
    expect(jobEnv).not.toContain('PRODUCTION_ORIGIN')
    expect(preproduction.env?.VITE_SUPABASE_URL).toBe(
      '${{ vars.VITE_SUPABASE_URL }}',
    )
  })

  it('generates an isolated Wrangler config and serves the uploaded version directly', async () => {
    const { preproduction } = await readWorkflows()
    const generate = stepByName(
      preproduction,
      'Generate the isolated pre-production Worker config',
    )
    const upload = stepByName(
      preproduction,
      'Upload the pre-production Worker version',
    )
    const serve = stepByName(preproduction, 'Serve the pre-production version')

    expect(generate?.run).toContain('preproduction-wrangler-config.ts')
    expect(upload?.run).toContain('wrangler.preproduction.generated.jsonc')
    expect(upload?.run).toContain('versions upload')
    expect(upload?.run).toContain('--keep-vars')
    expect(serve?.run).toContain('versions deploy')
    expect(serve?.run).toContain('$VERSION_ID@100')
    expect(serve?.run).not.toContain('wrangler.jsonc')
  })

  it('requires pre-production evidence before tagging the production release', async () => {
    const workflows = await readWorkflows()

    expect(workflows.evidenceStepIndex).toBeGreaterThanOrEqual(0)
    expect(workflows.identityStepIndex).toBeGreaterThan(
      workflows.evidenceStepIndex,
    )
    expect(workflows.evidenceScript).toContain('preproduction-gate.cjs')
    expect(workflows.evidenceScript).toContain('verifyPreproductionGate')
    expect(workflows.evidenceEnv.TARGET_SHA).toBe('${{ env.TARGET_SHA_INPUT }}')
    expect(workflows.evidenceEnv.GATE_RUN_ID).toBe(
      '${{ github.event.workflow_run.id }}',
    )
  })

  it('keeps the production journey smoke on the generic smoke env contract', async () => {
    const { journeyEnv } = await readWorkflows()

    expect(journeyEnv.SMOKE_BASE_URL).toBe('${{ env.PRODUCTION_ORIGIN }}')
    expect(journeyEnv.SMOKE_JOURNEY_PATHS).toBe(
      '${{ env.PRODUCTION_JOURNEY_PATHS }}',
    )
    expect(journeyEnv.SMOKE_VERSION_ID).toBe(
      '${{ steps.upload.outputs.version_id }}',
    )
    expect(journeyEnv.SMOKE_WORKER_NAME).toBe('${{ env.WORKER_NAME }}')
  })

  it('ignores the generated pre-production config and keeps journey smoke env-driven', () => {
    const gitignore = readFileSync('.gitignore', 'utf8')
    expect(gitignore).toContain('wrangler.preproduction.generated.jsonc')

    const journey = readFileSync('scripts/release-journey-smoke.ts', 'utf8')
    expect(journey).toContain("requiredEnv('SMOKE_BASE_URL')")
    expect(journey).toContain("requiredEnv('SMOKE_JOURNEY_PATHS')")
    expect(journey).not.toContain('PRODUCTION_JOURNEY_PATHS')
  })
})
