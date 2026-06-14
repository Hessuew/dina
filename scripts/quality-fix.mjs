import { spawnSync } from 'node:child_process'

import {
  getChangedFiles,
  getLintableFiles,
  getRepoRoot,
} from './quality-files.mjs'

const repoRoot = getRepoRoot()
const changedFiles = getChangedFiles({ includeCommitted: false })
const lintableFiles = getLintableFiles(changedFiles)

function formatCommand(command, args) {
  return [command, ...args].join(' ')
}

function runCheck({ name, command, args, skip = false }) {
  if (skip) {
    console.log(`\n==> ${name}: skipped`)
    return true
  }

  console.log(`\n==> ${name}: ${formatCommand(command, args)}`)

  const result = spawnSync(command, args, { cwd: repoRoot, stdio: 'inherit' })

  if (result.error) {
    console.error(`\n${name} failed to start: ${result.error.message}`)
    return false
  }

  if (result.status !== 0) {
    console.error(
      `\n${name} failed with exit code ${result.status ?? 'unknown'}.`,
    )
    return false
  }

  return true
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
