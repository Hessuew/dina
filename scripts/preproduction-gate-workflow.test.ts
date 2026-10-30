import { execFile } from 'node:child_process'
import { rm } from 'node:fs/promises'
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
  productionBuildScript: string
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
    const productionBuild = deploySteps.find((step) => step.name === 'Build the tagged production artifact and upload source maps') ?? {}
    console.log(JSON.stringify({
      preproduction: main.jobs.preproduction,
      gateJobIndex: jobNames.indexOf('preproduction'),
      resolveStepNames: resolveSteps.map((step) => step.name ?? step.id ?? ''),
      evidenceStepIndex: evidenceIndex,
      identityStepIndex: identityIndex,
      evidenceScript: String(evidence.with?.script ?? ''),
      evidenceEnv: evidence.env ?? {},
      journeyEnv: journey.env ?? {},
      productionBuildScript: String(productionBuild.run ?? ''),
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

  it('authenticates both smoke surfaces through the scoped Access service token', async () => {
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

    for (const step of [identity, health, journey]) {
      expect(step?.env?.PREPRODUCTION_ACCESS_CLIENT_ID).toBe(
        '${{ secrets.PREPRODUCTION_ACCESS_CLIENT_ID }}',
      )
      expect(step?.env?.PREPRODUCTION_ACCESS_CLIENT_SECRET).toBe(
        '${{ secrets.PREPRODUCTION_ACCESS_CLIENT_SECRET }}',
      )
    }
    expect(identity?.run).toContain('PREPRODUCTION_ACCESS_CLIENT_ID')
    expect(identity?.run).toContain('PREPRODUCTION_ACCESS_CLIENT_SECRET')
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

  it('never inherits production browser analytics or marketing trackers', async () => {
    const { preproduction } = await readWorkflows()
    const identity = stepByName(
      preproduction,
      'Validate pre-production isolation inputs',
    )
    const jobEnv = Object.keys(preproduction.env ?? {})

    expect(jobEnv).not.toContain('VITE_GOOGLE_ADS_ID')
    expect(jobEnv).not.toContain('VITE_META_PIXEL_ID')
    expect(jobEnv).not.toContain('VITE_POSTHOG_KEY')
    expect(jobEnv).not.toContain('VITE_POSTHOG_HOST')
    expect(identity?.run).not.toContain('VITE_GOOGLE_ADS_ID')
    expect(identity?.run).not.toContain('VITE_META_PIXEL_ID')
  })

  it('keeps WhatsApp sends disabled and credential-free in pre-production', async () => {
    const { preproduction } = await readWorkflows()
    const identity = stepByName(
      preproduction,
      'Validate pre-production isolation inputs',
    )
    const upload = stepByName(
      preproduction,
      'Upload the pre-production Worker version',
    )
    const jobEnv = Object.keys(preproduction.env ?? {})

    expect(preproduction.env?.WHATSAPP_ENABLED).toBe('false')
    expect(upload?.run).toContain('--var "WHATSAPP_ENABLED:$WHATSAPP_ENABLED"')
    for (const credential of [
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
    ]) {
      expect(jobEnv).not.toContain(credential)
      expect(identity?.run).not.toContain(credential)
      expect(upload?.run).not.toContain(credential)
    }
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

  it('fails the production build before compiling when conversion tracking ids are unset', async () => {
    const { productionBuildScript } = await readWorkflows()

    const adsGuard = productionBuildScript.indexOf('-z "$VITE_GOOGLE_ADS_ID"')
    const pixelGuard = productionBuildScript.indexOf('-z "$VITE_META_PIXEL_ID"')
    const buildIndex = productionBuildScript.indexOf('bun run build')

    expect(adsGuard).toBeGreaterThanOrEqual(0)
    expect(pixelGuard).toBeGreaterThanOrEqual(0)
    expect(buildIndex).toBeGreaterThan(Math.max(adsGuard, pixelGuard))
    expect(productionBuildScript.slice(0, buildIndex)).toContain('exit 1')
  })

  it('keeps the generated pre-production config ignored by git', async () => {
    const env = {
      ...process.env,
      PREPRODUCTION_WORKER_NAME: 'christ-dina-preproduction',
      PREPRODUCTION_HYPERDRIVE_ID: 'a'.repeat(32),
    }
    try {
      await execFileAsync(
        'bun',
        ['run', 'scripts/preproduction-wrangler-config.ts'],
        { env },
      )
      await execFileAsync('git', [
        'check-ignore',
        '-q',
        'wrangler.preproduction.generated.jsonc',
      ])
    } finally {
      await rm('wrangler.preproduction.generated.jsonc', { force: true })
    }
  })

  it('keeps the journey smoke on the shared env contract', async () => {
    const env = smokeContractEnv()

    const missingBaseUrl = await runJourneySmoke(env)
    expect(missingBaseUrl).toContain('SMOKE_BASE_URL is required')

    const missingJourneyPaths = await runJourneySmoke({
      ...env,
      SMOKE_BASE_URL: 'https://pre-production.invalid',
      PRODUCTION_JOURNEY_PATHS: '/login',
    })
    expect(missingJourneyPaths).toContain('SMOKE_JOURNEY_PATHS is required')

    const partialAccessToken = await runJourneySmoke({
      ...env,
      SMOKE_BASE_URL: 'https://pre-production.invalid',
      SMOKE_JOURNEY_PATHS: '/login',
      PREPRODUCTION_ACCESS_CLIENT_ID: 'client.access',
    })
    expect(partialAccessToken).toContain('must be supplied together')
  })
})

function smokeContractEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  for (const name of [
    'SMOKE_BASE_URL',
    'SMOKE_VERSION_ID',
    'SMOKE_WORKER_NAME',
    'SMOKE_EXPECTED_VERSION_ID',
    'SMOKE_EXPECTED_RELEASE',
    'SMOKE_JOURNEY_PATHS',
    'PRODUCTION_JOURNEY_PATHS',
    'PREPRODUCTION_ACCESS_CLIENT_ID',
    'PREPRODUCTION_ACCESS_CLIENT_SECRET',
  ]) {
    delete env[name]
  }
  env.SMOKE_EXPECTED_VERSION_ID = 'version-123'
  env.SMOKE_EXPECTED_RELEASE = 'pre-sha'
  return env
}

async function runJourneySmoke(env: NodeJS.ProcessEnv): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync(
      'bun',
      ['run', 'scripts/release-journey-smoke.ts'],
      { env },
    )
    return `${stdout}\n${stderr}`
  } catch (error) {
    const failure = error as {
      stdout?: string
      stderr?: string
      message?: string
    }
    return `${failure.stdout ?? ''}\n${failure.stderr ?? ''}\n${failure.message ?? ''}`
  }
}
