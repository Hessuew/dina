import { spawnSync } from 'node:child_process'

import {
  getChangedFiles,
  getLintableFiles,
  getRepoRoot,
} from './quality-files.mjs'
import {
  describeCheck,
  formatCommand,
  interpretCheckResult,
} from './quality-fix.domain.mjs'
import {
  blockingFallowVerdictMessage,
  collectIntroducedComplexity,
  extractJson,
  fallowExitStatusError,
  fallowExitStatusPasses,
  fallowVerdictAllowsSubmit,
  resolveVerdict,
} from './quality-gate.domain.mjs'

const repoRoot = getRepoRoot()
const qualityBase = process.env.QUALITY_BASE

function validateGitRef(ref) {
  const result = spawnSync('git', ['rev-parse', '--verify', ref], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.status !== 0) {
    throw new Error(
      `QUALITY_BASE ref '${ref}' does not exist or is not a valid git ref`,
    )
  }
}

if (qualityBase) {
  validateGitRef(qualityBase)
}

const changedFiles = getChangedFiles({
  includeCommitted: Boolean(qualityBase),
  base: qualityBase,
})
const lintableFiles = getLintableFiles(changedFiles)

const checks = [
  {
    name: 'Format changed files',
    command: 'bunx',
    args: ['prettier', '--check', '--ignore-unknown', ...changedFiles],
    skip: changedFiles.length === 0,
  },
  {
    name: 'Lint changed files',
    command: 'bunx',
    args: ['eslint', ...lintableFiles],
    skip: lintableFiles.length === 0,
  },
  { name: 'TypeScript', command: 'bun', args: ['run', 'typecheck'] },
  { name: 'Unit tests', command: 'bun', args: ['run', 'test'] },
  {
    name: 'Integration tests',
    command: 'bun',
    args: ['run', 'test:integration'],
  },
]

function runInheritedCheck(check) {
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

function formatSummary(summary = {}) {
  return Object.entries(summary)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ')
}

function collectUnusedExportFindings(output) {
  return (output.dead_code?.unused_exports ?? []).map((finding) => ({
    kind: 'unused-export',
    file: finding.path,
    message: `${finding.export_name} (${finding.introduced ? 'introduced' : 'inherited'})`,
  }))
}

function collectCircularDependencyFindings(output) {
  return (output.dead_code?.circular_dependencies ?? []).map((finding) => ({
    kind: 'circular-dependency',
    file: finding.files?.join(' -> '),
    message: `${finding.length ?? 'unknown'} file cycle (${finding.introduced ? 'introduced' : 'inherited'})`,
  }))
}

function collectComplexityFindings(output) {
  return (output.complexity?.findings ?? []).map((finding) => ({
    kind: 'complexity',
    file: finding.path,
    message: `${finding.name} ${finding.severity ?? 'unknown'} (cyclomatic ${finding.cyclomatic}, cognitive ${finding.cognitive})`,
  }))
}

function reportIntroducedComplexity(output) {
  const introduced = collectIntroducedComplexity(output)
  if (introduced.length === 0) return true

  console.error(
    `\nIntroduced complexity blocks submit (${introduced.length}); see docs/rules/complexity.md:`,
  )
  for (const finding of introduced) {
    console.error(
      `- ${finding.path}:${finding.line} ${finding.name} — cyclomatic ${finding.cyclomatic}, cognitive ${finding.cognitive}, crap ${finding.crap} (exceeded ${finding.exceeded})`,
    )
  }
  return false
}

function collectLegacyFindings(output) {
  return (Array.isArray(output.findings) ? output.findings : []).map(
    (finding) => ({
      kind: finding.type ?? finding.severity ?? 'finding',
      file: finding.file,
      message: finding.message,
    }),
  )
}

function collectFallowFindings(output) {
  return [
    ...collectUnusedExportFindings(output),
    ...collectCircularDependencyFindings(output),
    ...collectComplexityFindings(output),
    ...collectLegacyFindings(output),
  ]
}

function printOptionalSummary(summary) {
  if (summary) console.log(`Summary: ${summary}`)
}

function printFinding(finding) {
  const location = finding.file ? `${finding.file}: ` : ''
  console.log(`- [${finding.kind}] ${location}${finding.message}`)
}

function printOmittedFindings(count) {
  if (count > 0) console.log(`- ${count} additional finding(s) omitted`)
}

function printFallowSummary(output) {
  const findings = collectFallowFindings(output)
  printOptionalSummary(formatSummary(output.summary))
  findings.slice(0, 10).forEach(printFinding)
  printOmittedFindings(findings.length - 10)
}

function printUnparseableFallowOutput(error, result) {
  console.error(`\nFallow did not return parseable JSON: ${error.message}`)
  if (result.stdout.trim()) console.error(`stdout:\n${result.stdout.trim()}`)
  if (result.stderr.trim()) console.error(`stderr:\n${result.stderr.trim()}`)
}

function parseFallowOutput(result) {
  try {
    return extractJson(result.stdout)
  } catch (error) {
    printUnparseableFallowOutput(error, result)
    return null
  }
}

function reportBlockingFallowVerdict(verdict) {
  console.error(blockingFallowVerdictMessage(verdict))
  return false
}

function reportFallowExitStatus(result, verdict) {
  const passed = fallowExitStatusPasses(result.status, verdict)
  if (!passed) console.error(fallowExitStatusError(result.status))
  return passed
}

function reportFallowOutcome(output, result) {
  const verdict = resolveVerdict(output)
  console.log(`Fallow verdict: ${verdict}`)
  printFallowSummary(output)

  const complexityPassed = reportIntroducedComplexity(output)

  if (!fallowVerdictAllowsSubmit(verdict))
    return reportBlockingFallowVerdict(verdict)
  if (result.stderr.trim()) console.error(result.stderr.trim())

  return reportFallowExitStatus(result, verdict) && complexityPassed
}

function runFallowCheck() {
  const command = 'bunx'
  const args = [
    'fallow',
    'audit',
    '--format',
    'json',
    '--base',
    qualityBase ?? 'main',
    '--quiet',
  ]

  console.log(`\n==> Fallow: ${formatCommand(command, args)}`)

  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (result.error) {
    console.error(`\nFallow failed to start: ${result.error.message}`)
    return false
  }

  const output = parseFallowOutput(result)
  return output !== null && reportFallowOutcome(output, result)
}

console.log(
  `Changed files checked by format/lint: ${changedFiles.length}${qualityBase ? ` (base: ${qualityBase})` : ''}`,
)

for (const check of checks) {
  if (!runInheritedCheck(check)) {
    process.exit(1)
  }
}

if (!runFallowCheck()) {
  process.exit(1)
}

console.log('\nQuality gate passed.')
