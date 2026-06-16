import { spawnSync } from 'node:child_process'

import {
  getChangedFiles,
  getLintableFiles,
  getRepoRoot,
} from './quality-files.mjs'
import { describeCheck, interpretCheckResult } from './quality-fix.domain.mjs'

const repoRoot = getRepoRoot()
const changedFiles = getChangedFiles({ includeCommitted: false })
const lintableFiles = getLintableFiles(changedFiles)

function runCheck(check) {
  const { skip, log } = describeCheck(check)
  console.log(log)

  if (skip) {
    return true
  }

  const result = spawnSync(check.command, check.args, {
    cwd: repoRoot,
    stdio: 'inherit',
  })

  const { ok, error } = interpretCheckResult(check.name, result)
  if (error) {
    console.error(error)
  }

  return ok
}

console.log(`Changed files to fix: ${changedFiles.length}`)

const checks = [
  {
    name: 'Prettier write changed files',
    command: 'bunx',
    args: ['prettier', '--write', '--ignore-unknown', ...changedFiles],
    skip: changedFiles.length === 0,
  },
  {
    name: 'ESLint fix changed files',
    command: 'bunx',
    args: ['eslint', '--fix', ...lintableFiles],
    skip: lintableFiles.length === 0,
  },
]

for (const check of checks) {
  if (!runCheck(check)) {
    process.exit(1)
  }
}
