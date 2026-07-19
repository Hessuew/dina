import { spawnSync } from 'node:child_process'

import {
  getChangedFiles,
  getLintableFiles,
  getRepoRoot,
  validateGitRef,
} from './quality-files.mjs'
import { describeCheck, interpretCheckResult } from './quality-fix.domain.mjs'
import { runFallowCheck } from './quality-fallow.mjs'

const repoRoot = getRepoRoot()
const qualityBase = process.env.QUALITY_BASE

if (qualityBase) {
  validateGitRef(qualityBase, { repoRoot })
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

console.log(
  `Changed files checked by format/lint: ${changedFiles.length}${qualityBase ? ` (base: ${qualityBase})` : ''}`,
)

for (const check of checks) {
  if (!runInheritedCheck(check)) {
    process.exit(1)
  }
}

if (!runFallowCheck({ repoRoot, base: qualityBase ?? 'main' })) {
  process.exit(1)
}

console.log('\nQuality gate passed.')
