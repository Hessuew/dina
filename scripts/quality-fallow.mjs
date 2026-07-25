import { spawnSync } from 'node:child_process'

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
  const unused = (output.dead_code?.unused_exports ?? []).map((finding) => ({
    kind: 'unused-export',
    file: finding.path,
    message: finding.export_name,
  }))
  const cycles = (output.dead_code?.circular_dependencies ?? []).map(
    (finding) => ({
      kind: 'circular-dependency',
      file: finding.files?.join(' -> '),
      message: `${finding.length ?? 'unknown'} file cycle`,
    }),
  )
  const complexity = (output.complexity?.findings ?? []).map((finding) => ({
    kind: 'complexity',
    file: finding.path,
    message: `${finding.name} (${finding.exceeded ?? 'threshold'})`,
  }))
  return [...unused, ...cycles, ...complexity]
}

function printFallowSummary(output) {
  const summary = formatSummary(output.summary)
  const findings = collectFallowFindings(output)
  if (summary) console.log(`summary: ${summary}`)
  for (const finding of findings.slice(0, 10)) {
    console.log(
      `finding: [${finding.kind}] ${finding.file}: ${finding.message}`,
    )
  }
  if (findings.length > 10) {
    console.log(`omitted_findings: ${findings.length - 10}`)
  }
}

function reportIntroducedComplexity(output) {
  const introduced = collectIntroducedComplexity(output)
  if (introduced.length === 0) return true

  console.error(`Introduced complexity blocks submit: ${introduced.length}`)
  for (const finding of introduced) {
    console.error(
      `${finding.path}:${finding.line} ${finding.name} (cyclomatic ${finding.cyclomatic}, cognitive ${finding.cognitive}, crap ${finding.crap})`,
    )
  }
  return false
}

function parseFallowOutput(result) {
  try {
    return extractJson(result.stdout)
  } catch (error) {
    console.error(`Fallow returned invalid output: ${error.message}`)
    return null
  }
}

function reportFallowOutcome(output, result) {
  const verdict = resolveVerdict(output)
  console.log(`fallow_verdict: ${verdict}`)
  printFallowSummary(output)
  const complexityPassed = reportIntroducedComplexity(output)

  if (!fallowVerdictAllowsSubmit(verdict)) {
    console.error(blockingFallowVerdictMessage(verdict))
    return false
  }

  const statusPassed = fallowExitStatusPasses(result.status, verdict)
  if (!statusPassed) console.error(fallowExitStatusError(result.status))
  return statusPassed && complexityPassed
}

export function runFallowCheck({ repoRoot, base }) {
  const result = spawnSync(
    'bunx',
    ['fallow', 'audit', '--format', 'json', '--base', base, '--quiet'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  if (result.error) {
    console.error(`Fallow failed to start: ${result.error.message}`)
    return false
  }

  const output = parseFallowOutput(result)
  return output !== null && reportFallowOutcome(output, result)
}
