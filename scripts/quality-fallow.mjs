import { spawnSync } from 'node:child_process'

import { formatCommand } from './quality-fix.domain.mjs'
import {
  blockingFallowVerdictMessage,
  collectIntroducedComplexity,
  extractJson,
  fallowExitStatusError,
  fallowExitStatusPasses,
  fallowVerdictAllowsSubmit,
  resolveVerdict,
} from './quality-gate.domain.mjs'

function formatSummary(summary = {}) {
  return Object.entries(summary)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ')
}

function collectFallowFindings(output) {
  const unusedExports = (output.dead_code?.unused_exports ?? []).map(
    (finding) => ({
      kind: 'unused-export',
      file: finding.path,
      message: `${finding.export_name} (${finding.introduced ? 'introduced' : 'inherited'})`,
    }),
  )
  const cycles = (output.dead_code?.circular_dependencies ?? []).map(
    (finding) => ({
      kind: 'circular-dependency',
      file: finding.files?.join(' -> '),
      message: `${finding.length ?? 'unknown'} file cycle (${finding.introduced ? 'introduced' : 'inherited'})`,
    }),
  )
  const complexity = (output.complexity?.findings ?? []).map((finding) => ({
    kind: 'complexity',
    file: finding.path,
    message: `${finding.name} ${finding.severity ?? 'unknown'} (cyclomatic ${finding.cyclomatic}, cognitive ${finding.cognitive})`,
  }))
  const legacy = (Array.isArray(output.findings) ? output.findings : []).map(
    (finding) => ({
      kind: finding.type ?? finding.severity ?? 'finding',
      file: finding.file,
      message: finding.message,
    }),
  )

  return [...unusedExports, ...cycles, ...complexity, ...legacy]
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

function printFallowSummary(output) {
  const findings = collectFallowFindings(output)
  const summary = formatSummary(output.summary)
  if (summary) console.log(`Summary: ${summary}`)

  for (const finding of findings.slice(0, 10)) {
    const location = finding.file ? `${finding.file}: ` : ''
    console.log(`- [${finding.kind}] ${location}${finding.message}`)
  }
  if (findings.length > 10) {
    console.log(`- ${findings.length - 10} additional finding(s) omitted`)
  }
}

function parseFallowOutput(result) {
  try {
    return extractJson(result.stdout)
  } catch (error) {
    console.error(`\nFallow did not return parseable JSON: ${error.message}`)
    if (result.stdout.trim()) console.error(`stdout:\n${result.stdout.trim()}`)
    if (result.stderr.trim()) console.error(`stderr:\n${result.stderr.trim()}`)
    return null
  }
}

function reportFallowOutcome(output, result) {
  const verdict = resolveVerdict(output)
  console.log(`Fallow verdict: ${verdict}`)
  printFallowSummary(output)

  const complexityPassed = reportIntroducedComplexity(output)
  if (!fallowVerdictAllowsSubmit(verdict)) {
    console.error(blockingFallowVerdictMessage(verdict))
    return false
  }
  if (result.stderr.trim()) console.error(result.stderr.trim())

  const statusPassed = fallowExitStatusPasses(result.status, verdict)
  if (!statusPassed) console.error(fallowExitStatusError(result.status))
  return statusPassed && complexityPassed
}

export function runFallowCheck({ repoRoot, base }) {
  const command = 'bunx'
  const args = [
    'fallow',
    'audit',
    '--format',
    'json',
    '--base',
    base,
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
