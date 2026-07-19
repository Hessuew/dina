import { spawnSync } from 'node:child_process'
import { lstatSync } from 'node:fs'
import path from 'node:path'

const lintableExtensionPattern = /\.(?:[cm]?[jt]sx?)$/u

function gitErrorMessage(args, stderr, stdout) {
  const details = stderr.trim() || stdout.trim()
  return `git ${args.join(' ')} failed${details ? `: ${details}` : ' with no output'}`
}

function assertGitStarted(result, args) {
  if (!result.error) return
  throw new Error(
    `git ${args.join(' ')} failed to start: ${result.error.message}`,
  )
}

function assertGitSucceeded(result, args, allowFailure) {
  if (result.status === 0 || allowFailure) return
  throw new Error(gitErrorMessage(args, result.stderr, result.stdout))
}

function runGit(args, { repoRoot, allowFailure = false } = {}) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  assertGitStarted(result, args)
  assertGitSucceeded(result, args, allowFailure)

  return result
}

export function getRepoRoot() {
  const result = runGit(['rev-parse', '--show-toplevel'])
  return result.stdout.trim()
}

export function validateGitRef(ref, { repoRoot = getRepoRoot() } = {}) {
  const result = runGit(['rev-parse', '--verify', ref], {
    repoRoot,
    allowFailure: true,
  })

  if (result.status !== 0) {
    throw new Error(
      `QUALITY_BASE ref '${ref}' does not exist or is not a valid git ref`,
    )
  }
}

function addFilesFromGit(files, args, repoRoot) {
  const result = runGit(args, { repoRoot })

  for (const file of result.stdout.split('\n')) {
    const trimmed = file.trim()

    if (trimmed) {
      files.add(trimmed)
    }
  }
}

function isRegularFile(repoRoot, file) {
  try {
    return lstatSync(path.join(repoRoot, file)).isFile()
  } catch {
    return false
  }
}

export function getChangedFiles({ includeCommitted = false, base } = {}) {
  const repoRoot = getRepoRoot()
  const files = new Set()

  if (includeCommitted) {
    if (!base) {
      throw new Error('A base ref is required when includeCommitted is true')
    }

    addFilesFromGit(
      files,
      ['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`],
      repoRoot,
    )
  }

  addFilesFromGit(
    files,
    ['diff', '--name-only', '--diff-filter=ACMR'],
    repoRoot,
  )
  addFilesFromGit(
    files,
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
    repoRoot,
  )
  addFilesFromGit(
    files,
    ['ls-files', '--others', '--exclude-standard'],
    repoRoot,
  )

  return [...files]
    .filter((file) => isRegularFile(repoRoot, file))
    .sort((left, right) => left.localeCompare(right))
}

export function getLintableFiles(files) {
  return files.filter((file) => lintableExtensionPattern.test(file))
}
