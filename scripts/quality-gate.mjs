import {
  getChangedFiles,
  getChangedPaths,
  getRepoRoot,
  validateGitRef,
} from './quality-files.mjs'
import { runPlannedChecks } from './quality-runner.mjs'
import {
  planVerification,
  resolveQualityBase,
} from './quality-verification.domain.mjs'

const validModes = new Set(['static', 'test', 'gate', 'release'])

function failUsage(mode) {
  console.log(`error: unknown verification mode "${mode ?? ''}"`)
  console.log('valid_modes[4]: static,test,gate,release')
  process.exit(2)
}

function printPlan(plan) {
  console.log(`verification: ${plan.mode}`)
  console.log(`base: ${plan.base}`)
  console.log(`changed_paths: ${plan.changedPaths.length}`)
  console.log(`docs_only: ${plan.docsOnly}`)
}

function printCheck(check) {
  const skipped = check.skip || check.files?.length === 0
  const status = skipped ? 'skipped' : 'running'
  console.error(`\n==> ${check.name}: ${status}`)
}

const mode = process.argv[2] ?? 'gate'
if (!validModes.has(mode) || process.argv.length > 3) failUsage(mode)

const repoRoot = getRepoRoot()
const base = resolveQualityBase(process.env.QUALITY_BASE)
validateGitRef(base, { repoRoot })

const changeOptions = { includeCommitted: true, base }
const plan = planVerification({
  mode,
  qualityBase: base,
  changedPaths: getChangedPaths(changeOptions),
  existingFiles: getChangedFiles(changeOptions),
})

printPlan(plan)
const passed = runPlannedChecks(plan, { repoRoot, onCheck: printCheck })
if (!passed) process.exit(1)
console.log(`result: ${mode} verification passed`)
