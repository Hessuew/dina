import { spawnSync } from 'node:child_process'

import { runFallowCheck } from './quality-fallow.mjs'

/**
 * @typedef {{ error?: Error, status: number | null }} CheckResult
 */

/**
 * @returns {CheckResult}
 */
function defaultRunCommand(check, repoRoot) {
  return spawnSync(check.command, [...check.args, ...(check.files ?? [])], {
    cwd: repoRoot,
    stdio: 'inherit',
  })
}

function checkPassed(result) {
  return !result.error && result.status === 0
}

function reportFailure(check, result) {
  if (result.error) {
    console.error(`${check.name} failed to start: ${result.error.message}`)
    return
  }
  console.error(
    `${check.name} failed with exit code ${result.status ?? 'unknown'}.`,
  )
}

export function runPlannedChecks(
  plan,
  {
    repoRoot,
    runCommand = defaultRunCommand,
    runFallow = runFallowCheck,
    onCheck = () => {},
  },
) {
  for (const check of plan.checks) {
    onCheck(check)
    if (check.skip || check.files?.length === 0) continue

    if (check.kind === 'fallow') {
      if (!runFallow({ repoRoot, base: plan.base })) return false
      continue
    }

    const result = runCommand(check, repoRoot)
    if (!checkPassed(result)) {
      reportFailure(check, result)
      return false
    }
  }
  return true
}
