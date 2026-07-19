import { spawnSync } from 'node:child_process'

import {
  planFocusedVerification,
  resolveQualityBase,
} from './focused-verification.domain.mjs'
import {
  getChangedFiles,
  getLintableFiles,
  getRepoRoot,
  validateGitRef,
} from './quality-files.mjs'
import { describeCheck, interpretCheckResult } from './quality-fix.domain.mjs'
import { runFallowCheck } from './quality-fallow.mjs'

const validLanes = new Set(['static', 'test'])

function runCheck(check, repoRoot) {
  const plan = describeCheck(check)
  console.log(plan.log)
  if (plan.skip) return true

  const result = spawnSync(check.command, check.args, {
    cwd: repoRoot,
    stdio: 'inherit',
  })
  const outcome = interpretCheckResult(check.name, result)
  if (!outcome.ok) console.error(outcome.error)
  return outcome.ok
}

function runChecks(checks, repoRoot) {
  for (const check of checks) {
    if (!runCheck(check, repoRoot)) return false
  }
  return true
}

function staticChecks(plan) {
  const lintableFiles = getLintableFiles(plan.changedFiles)
  return [
    {
      name: 'Prettier changed files',
      command: 'bunx',
      args: ['prettier', '--check', '--ignore-unknown', ...plan.changedFiles],
      skip: plan.changedFiles.length === 0,
    },
    {
      name: 'ESLint changed files',
      command: 'bunx',
      args: ['eslint', ...lintableFiles],
      skip: lintableFiles.length === 0,
    },
  ]
}

function relatedVitestCheck(name, files, extraArgs = []) {
  return {
    name,
    command: 'bunx',
    args: [
      'vitest',
      'related',
      ...files,
      ...extraArgs,
      '--run',
      '--passWithNoTests',
    ],
    skip: files.length === 0,
  }
}

function testChecks(plan) {
  const integrationCheck = plan.fullIntegration
    ? {
        name: 'Full integration tests (escalated)',
        command: 'bun',
        args: ['run', 'test:integration'],
      }
    : relatedVitestCheck(
        'Related integration tests',
        plan.integrationRelatedFiles,
        ['--config', 'vitest.integration.config.ts'],
      )

  return [
    { name: 'TypeScript', command: 'bun', args: ['run', 'typecheck'] },
    relatedVitestCheck('Related unit tests', plan.unitRelatedFiles),
    integrationCheck,
  ]
}

function failUsage(lane) {
  console.log(`error: unknown focused verification lane "${lane ?? ''}"`)
  console.log(
    'help[1]: bun run verify:focused:static | bun run verify:focused:test',
  )
  process.exit(2)
}

const lane = process.argv[2]
if (!validLanes.has(lane) || process.argv.length !== 3) failUsage(lane)

const repoRoot = getRepoRoot()
const base = resolveQualityBase(process.env.QUALITY_BASE)
validateGitRef(base, { repoRoot })

const changedFiles = getChangedFiles({ includeCommitted: true, base })
const plan = planFocusedVerification(changedFiles, base)
console.log(`verification: focused-${lane}`)
console.log(`base: ${plan.base}`)
console.log(`changed_files: ${plan.changedFiles.length}`)

const checks = lane === 'static' ? staticChecks(plan) : testChecks(plan)
if (!runChecks(checks, repoRoot)) process.exit(1)

if (
  lane === 'static' &&
  plan.fallowApplicable &&
  !runFallowCheck({ repoRoot, base: plan.base })
) {
  process.exit(1)
}

if (lane === 'static' && !plan.fallowApplicable) {
  console.log('\n==> Fallow changed-diff audit: skipped (no applicable files)')
}

console.log(`\nFocused ${lane} verification passed.`)
