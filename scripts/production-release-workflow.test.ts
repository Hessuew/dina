import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

type SecretScope = 'absent' | 'job' | 'step' | 'command'

type CommandContract = {
  integrationTests: boolean
  migrations: boolean
  build: boolean
  healthSmoke: boolean
  journeySmoke: boolean
  rollbackSmoke: boolean
  metricsQuery: boolean
  guardrailEvaluation: boolean
  urlValidation: boolean
  outputDirectory: string | undefined
  waits: Array<number>
}

type StepContract = {
  action: string | undefined
  command: CommandContract
  condition: string | undefined
  secretScopes: Record<string, SecretScope>
  environmentKeys: Array<string>
}

type ParsedWorkflow = {
  runNameUsesTargetSha: boolean
  workflowRun: {
    workflows: Array<string>
    types: Array<string>
    branches: Array<string>
  }
  resolveCondition: string
  resolve: {
    productionReleaseEnabledDefault: string | undefined
    affinityReadyDefault: string | undefined
    affinityEvidenceRequired: boolean
    toolingShaOutput: boolean
  }
  migration: {
    integration: StepContract
    apply: StepContract
  }
  deploy: {
    environment: string | undefined
    jobSecretScopes: Record<string, SecretScope>
    providerActions: Record<string, string | undefined>
    toolingCheckoutRole: string | undefined
    targetCheckoutRole: string | undefined
    targetInstallDirectory: string | undefined
    build: StepContract & { outputDirectory: string | undefined }
    upload: StepContract
    exactHealth: StepContract
    journey: StepContract
    postRolloutHealth: StepContract & {
      usesVersionOverride: boolean
      expectsVersionIdentity: boolean
    }
    rollout: StepContract
    standardGuardrails: StepContract & { profile: string | undefined }
    rollback: StepContract & {
      targetFromPreflight: boolean
      smokeTargetFromPreflight: boolean
    }
    rolloutReadinessBeforePromotion: boolean
    publication: StepContract & {
      previousReleaseFromPreflight: boolean
      beforeRollback: boolean
    }
    sentryUrlsValidated: boolean
    sentryEndpointValidationHasNoToken: boolean
    sentryEndpointValidationBeforeSourceMaps: boolean
  }
}

const SECRET_NAMES = [
  'DATABASE_URL',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_VERSION_METRICS_TOKEN',
  'PRODUCTION_RELEASE_EVIDENCE_TOKEN',
  'SENTRY_AUTH_TOKEN',
]

describe('production release workflow semantics', () => {
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

  it('keeps release identity and safety tooling on the current revision', async () => {
    const workflow = await readWorkflow()

    expect(workflow.runNameUsesTargetSha).toBe(true)
    expect(workflow.resolve.toolingShaOutput).toBe(true)
    expect(workflow.deploy.toolingCheckoutRole).toBe('tooling')
    expect(workflow.deploy.targetCheckoutRole).toBe('application')
    expect(workflow.deploy.targetInstallDirectory).toBe('target')
    expect(workflow.deploy.build.outputDirectory).toBe('../dist')
    expect(workflow.deploy.providerActions).toEqual({
      trustedRelease: 'github-script',
      tagProtection: 'github-script',
      manualTarget: 'github-script',
    })
  })

  it('keeps production credentials out of tests and scopes them to consumers', async () => {
    const workflow = await readWorkflow()

    expect(workflow.migration.integration.secretScopes.DATABASE_URL).toBe(
      'absent',
    )
    expect(workflow.migration.apply.secretScopes.DATABASE_URL).toBe('step')
    expect(workflow.deploy.jobSecretScopes).toEqual(
      Object.fromEntries(SECRET_NAMES.map((name) => [name, 'absent'])),
    )
    expect(workflow.deploy.rollout.secretScopes).toMatchObject({
      CLOUDFLARE_API_TOKEN: 'step',
      CLOUDFLARE_ACCOUNT_ID: 'step',
      CLOUDFLARE_VERSION_METRICS_TOKEN: 'command',
    })
    expect(
      workflow.deploy.standardGuardrails.secretScopes
        .CLOUDFLARE_VERSION_METRICS_TOKEN,
    ).toBe('command')
    expect(workflow.deploy.build.secretScopes.SENTRY_AUTH_TOKEN).toBe('absent')
    expect(workflow.deploy.upload.secretScopes).toMatchObject({
      CLOUDFLARE_API_TOKEN: 'step',
      CLOUDFLARE_ACCOUNT_ID: 'step',
    })
  })

  it('requires exact-version smoke before promotion and live-traffic smoke after it', async () => {
    const workflow = await readWorkflow()

    expect(workflow.deploy.exactHealth.command.healthSmoke).toBe(true)
    expect(workflow.deploy.exactHealth.environmentKeys).toContain(
      'SMOKE_VERSION_ID',
    )
    expect(workflow.deploy.journey.command.journeySmoke).toBe(true)
    expect(workflow.deploy.journey.environmentKeys).toContain(
      'SMOKE_VERSION_ID',
    )
    expect(workflow.deploy.postRolloutHealth.command.healthSmoke).toBe(true)
    expect(workflow.deploy.postRolloutHealth.usesVersionOverride).toBe(false)
    expect(workflow.deploy.postRolloutHealth.expectsVersionIdentity).toBe(true)
  })

  it('fails closed around standard rollout guardrails and verified rollback', async () => {
    const workflow = await readWorkflow()

    expect(workflow.deploy.environment).toBe('production')
    expect(workflow.deploy.standardGuardrails.profile).toBe('standard')
    expect(workflow.deploy.rolloutReadinessBeforePromotion).toBe(true)
    expect(workflow.deploy.standardGuardrails.command).toMatchObject({
      metricsQuery: true,
      guardrailEvaluation: true,
      waits: [300],
    })
    expect(workflow.deploy.rollback.command.rollbackSmoke).toBe(true)
    expect(workflow.deploy.rollback.targetFromPreflight).toBe(true)
    expect(workflow.deploy.rollback.smokeTargetFromPreflight).toBe(true)
    expect(workflow.deploy.sentryUrlsValidated).toBe(true)
    expect(workflow.deploy.sentryEndpointValidationHasNoToken).toBe(true)
    expect(workflow.deploy.sentryEndpointValidationBeforeSourceMaps).toBe(true)
  })

  it('records the trusted previous release before publication and rollback', async () => {
    const workflow = await readWorkflow()

    expect(workflow.deploy.publication.previousReleaseFromPreflight).toBe(true)
    expect(workflow.deploy.publication.beforeRollback).toBe(true)
  })

  it('keeps production release disabled by default and requires affinity evidence', async () => {
    const workflow = await readWorkflow()

    expect(workflow.resolve.productionReleaseEnabledDefault).toBe('false')
    expect(workflow.resolve.affinityReadyDefault).toBe('false')
    expect(workflow.resolve.affinityEvidenceRequired).toBe(true)
  })
})

async function readWorkflow(): Promise<ParsedWorkflow> {
  const workflowPath = new URL(
    '../.github/workflows/production-release.yml',
    import.meta.url,
  ).pathname
  const script = `
    const workflow = Bun.YAML.parse(await Bun.file(process.argv[1]).text())
    const step = (steps, predicate) => steps.find(predicate)
    const resolveSteps = workflow.jobs.resolve.steps
    const migrateSteps = workflow.jobs.migrate.steps
    const deploySteps = workflow.jobs.deploy.steps
    const normalize = (value) => String(value ?? '').replace(/\\\\\\s*\\n/gu, ' ').replace(/\\s+/gu, ' ')
    const { parse: parseShell } = require('shell-quote')
    const shellWords = (value) => parseShell(normalize(value)).filter((token) => typeof token === 'string').flatMap((token) => {
      const substitution = /^.*\\$\\((.*)\\)$/su.exec(token)
      if (!substitution) return [token]
      return [token, ...parseShell(substitution[1]).filter((nested) => typeof nested === 'string')]
    })
    const findCommand = (words, target, argument) => {
      const index = words.findIndex((word, position) =>
        word === 'bun' &&
        words[position + 1] === 'run' &&
        words[position + 2] === target,
      )
      if (index < 0) return null
      if (argument !== undefined && words[index + 3] !== argument) return null
      return { index, words }
    }
    const commandContract = (value) => {
      const words = shellWords(value)
      const command = (target, argument) => Boolean(findCommand(words, target, argument))
      const outputDirectoryIndex = words.indexOf('--outDir')
      return {
        integrationTests: command('test:integration'),
        migrations: command('db:migrate'),
        build: command('build'),
        healthSmoke: command('scripts/retry-release-smoke.ts', 'health'),
        journeySmoke: command('scripts/retry-release-smoke.ts', 'journey'),
        rollbackSmoke: command('scripts/retry-release-smoke.ts', 'rollback'),
        metricsQuery: command('scripts/release-metrics.ts'),
        guardrailEvaluation: command('scripts/release-policy.ts', 'guardrails'),
        urlValidation: command('scripts/release-policy.ts', 'validate-url'),
        outputDirectory: outputDirectoryIndex >= 0 ? words[outputDirectoryIndex + 1] : undefined,
        waits: words.flatMap((word, index) => word === 'sleep' && /^\\d+$/u.test(words[index + 1] ?? '') ? [Number(words[index + 1])] : []),
      }
    }
    const action = (step) => step?.uses?.split('@')[0]?.split('/').at(-1)
    const environmentKeys = (step) => Object.keys(step?.env ?? {})
    const secretScope = (holder, step, secret) => {
      if (holder?.env && Object.prototype.hasOwnProperty.call(holder.env, secret)) return 'job'
      if (step?.env && Object.prototype.hasOwnProperty.call(step.env, secret)) return 'step'
      const words = shellWords(step?.run)
      const metricsCommand = findCommand(words, 'scripts/release-metrics.ts')
      if (
        metricsCommand &&
        words.slice(0, metricsCommand.index).some((word) =>
          word.startsWith(secret + '='),
        )
      ) return 'command'
      return 'absent'
    }
    const stepContract = (holder, step) => ({
      action: action(step),
      command: commandContract(step?.run),
      condition: step?.if,
      secretScopes: Object.fromEntries(${JSON.stringify(SECRET_NAMES)}.map((secret) => [secret, secretScope(holder, step, secret)])),
      environmentKeys: environmentKeys(step),
    })
    const expressionReference = (value) => {
      const match = /^\\$\\{\\{\\s*([^{}]+?)\\s*\\}\\}$/u.exec(
        String(value ?? '').trim(),
      )
      return match?.[1].trim()
    }
    const expressionReferences = (value) => {
      const references = []
      const expression = String(value ?? '')
      const pattern = /\\$\\{\\{\\s*([^{}]+?)\\s*\\}\\}/gu
      let match
      while ((match = pattern.exec(expression))) references.push(match[1].trim())
      return references
    }
    const expressionHasReference = (value, reference) =>
      expressionReferences(value).some((expression) =>
        expression.split(/\\s*(?:\\|\\||&&)\\s*/u).includes(reference),
      )
    const equalityExpression = (value) => {
      const expression = expressionReference(value) ?? String(value ?? '').trim()
      const match = /^([A-Za-z0-9._-]+)\\s*==\\s*'([^']*)'$/u.exec(expression)
      return match ? { left: match[1], right: match[2] } : undefined
    }
    const fallbackExpression = (value) => {
      const expression = expressionReference(value)
      const match = expression
        ? /^([A-Za-z0-9._-]+)\\s*\\|\\|\\s*'([^']*)'$/u.exec(expression)
        : undefined
      return match ? { variable: match[1], fallback: match[2] } : undefined
    }
    const checkoutRole = (step) => {
      const ref = expressionReference(step?.with?.ref)
      if (ref === 'needs.resolve.outputs.tooling_sha') return 'tooling'
      if (ref === 'needs.resolve.outputs.target_sha') return 'application'
      return undefined
    }
    const envDefault = (value) => fallbackExpression(value)?.fallback
    const trustedRelease = step(deploySteps, (item) => item.id === 'trusted_releases')
    const tagProtection = step(resolveSteps, (item) => item.name === 'Verify immutable v* tag protection')
    const manualTarget = step(resolveSteps, (item) => item.name === 'Verify manual target is current or previously trusted')
    const affinity = step(resolveSteps, (item) => item.name === 'Verify Cloudflare version-affinity readiness')
    const integration = step(migrateSteps, (item) => item.name === 'Replay the committed migration chain')
    const apply = step(migrateSteps, (item) => item.name === 'Apply compatible pending migrations without seeding')
    const rollout = step(deploySteps, (item) => item.id === 'rollout')
    const standardGuardrails = step(deploySteps, (item) => item.id === 'standard_guardrails')
    const rolloutReadiness = step(deploySteps, (item) => item.id === 'rollout_readiness')
    const exactHealth = step(deploySteps, (item) => item.name === 'Run exact-version health smoke')
    const journey = step(deploySteps, (item) => item.name === 'Run affected public journey smoke through the version override')
    const postRolloutHealth = step(deploySteps, (item) => item.name === 'Verify the promoted version after rollout')
    const rollback = step(deploySteps, (item) => item.id === 'rollback')
    const publicationIndex = deploySteps.findIndex((item) => item.name === 'Publish GitHub Release evidence and deployment binding')
    const rollbackIndex = deploySteps.findIndex((item) => item.id === 'rollback')
    const publication = step(deploySteps, (item) => item.name === 'Publish GitHub Release evidence and deployment binding')
    const build = step(deploySteps, (item) => item.name === 'Build the tagged production artifact and upload source maps')
    const upload = step(deploySteps, (item) => item.name === 'Upload an undeployed Cloudflare Worker version')
    const sourceMapUpload = step(deploySteps, (item) => item.name === 'Upload tagged source maps')
    const sourceMapVerify = step(deploySteps, (item) => item.name === 'Verify that the tagged source maps are queryable')
    const sentryEndpointValidation = step(deploySteps, (item) => item.id === 'validate_sentry_url')
    const deployCheckouts = deploySteps.filter((item) => item.uses === 'actions/checkout@v4')
    console.log(JSON.stringify({
      runNameUsesTargetSha: expressionHasReference(workflow['run-name'], 'inputs.target_sha'),
      workflowRun: workflow.on.workflow_run,
      resolveCondition: String(workflow.jobs.resolve.if),
      resolve: {
        productionReleaseEnabledDefault: envDefault(workflow.jobs.resolve.env.PRODUCTION_RELEASE_ENABLED),
        affinityReadyDefault: envDefault(workflow.jobs.resolve.env.CLOUDFLARE_VERSION_AFFINITY_READY),
        affinityEvidenceRequired: Boolean(affinity?.env?.CLOUDFLARE_VERSION_AFFINITY_EVIDENCE_URL),
        toolingShaOutput:
          expressionReference(workflow.jobs.resolve.outputs.tooling_sha) ===
          'steps.identity.outputs.tooling_sha',
      },
      migration: {
        integration: stepContract(null, integration),
        apply: stepContract(null, apply),
      },
      deploy: {
        environment: workflow.jobs.deploy.environment,
        jobSecretScopes: Object.fromEntries(${JSON.stringify(SECRET_NAMES)}.map((secret) => [secret, secretScope(workflow.jobs.deploy, null, secret)])),
        providerActions: {
          trustedRelease: action(trustedRelease),
          tagProtection: action(tagProtection),
          manualTarget: action(manualTarget),
        },
        toolingCheckoutRole: checkoutRole(deployCheckouts[0]),
        targetCheckoutRole: checkoutRole(deployCheckouts[1]),
        targetInstallDirectory: step(deploySteps, (item) => item.name === 'Install target application dependencies')?.['working-directory'],
        build: {
          ...stepContract(workflow.jobs.deploy, build),
          outputDirectory: commandContract(build?.run).outputDirectory,
        },
        upload: stepContract(workflow.jobs.deploy, upload),
        exactHealth: stepContract(workflow.jobs.deploy, exactHealth),
        journey: stepContract(workflow.jobs.deploy, journey),
        postRolloutHealth: {
          ...stepContract(workflow.jobs.deploy, postRolloutHealth),
          usesVersionOverride: environmentKeys(postRolloutHealth).includes('SMOKE_VERSION_ID'),
          expectsVersionIdentity: environmentKeys(postRolloutHealth).includes('SMOKE_EXPECTED_VERSION_ID'),
        },
        rollout: stepContract(workflow.jobs.deploy, rollout),
        standardGuardrails: {
          ...stepContract(workflow.jobs.deploy, standardGuardrails),
          profile: equalityExpression(standardGuardrails?.if)?.right,
        },
        rollback: {
          ...stepContract(workflow.jobs.deploy, rollback),
          targetFromPreflight:
            expressionReference(rollback?.env?.ROLLBACK_VERSION_ID) ===
            'steps.preflight.outputs.previous_version_id',
          smokeTargetFromPreflight:
            expressionReference(rollback?.env?.SMOKE_VERSION_ID) ===
            'steps.preflight.outputs.previous_version_id',
        },
        publication: {
          ...stepContract(workflow.jobs.deploy, publication),
          previousReleaseFromPreflight:
            expressionReference(publication?.env?.PREVIOUS_RELEASE_TAG) ===
            'steps.preflight.outputs.previous_release_tag',
          beforeRollback: publicationIndex >= 0 && publicationIndex < rollbackIndex,
        },
        rolloutReadinessBeforePromotion:
          deploySteps.indexOf(rolloutReadiness) >= 0 &&
          deploySteps.indexOf(rolloutReadiness) < deploySteps.indexOf(rollout),
        sentryUrlsValidated:
          commandContract(sentryEndpointValidation?.run).urlValidation &&
          sourceMapUpload?.env?.SENTRY_URL ===
            '\${{ steps.validate_sentry_url.outputs.url }}' &&
          sourceMapVerify?.env?.SENTRY_URL ===
            '\${{ steps.validate_sentry_url.outputs.url }}',
        sentryEndpointValidationHasNoToken:
          secretScope(
            workflow.jobs.deploy,
            sentryEndpointValidation,
            'SENTRY_AUTH_TOKEN',
          ) === 'absent',
        sentryEndpointValidationBeforeSourceMaps:
          deploySteps.indexOf(sentryEndpointValidation) >= 0 &&
          deploySteps.indexOf(sentryEndpointValidation) <
            deploySteps.indexOf(sourceMapUpload) &&
          deploySteps.indexOf(sentryEndpointValidation) <
            deploySteps.indexOf(sourceMapVerify),
      },
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
