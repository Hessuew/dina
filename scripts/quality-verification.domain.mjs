const lintablePattern = /\.(?:[cm]?[jt]sx?)$/u
const rootMarkdownPattern = /^[^/]+\.md$/u
const pullRequestMarkdownPattern =
  /^\.github\/(?:PULL_REQUEST_TEMPLATE\.md|PULL_REQUEST_TEMPLATE\/.*\.md)$/u
const fallowPathPattern =
  /^(?:src\/(?:components|routes|utils)\/|\.fallowrc\.json$)/u

const commandCatalog = {
  format: {
    id: 'format',
    name: 'Prettier changed files',
    command: 'bunx',
    args: ['prettier', '--check', '--ignore-unknown'],
  },
  lint: {
    id: 'lint',
    name: 'ESLint changed files',
    command: 'bunx',
    args: ['eslint'],
  },
  fallow: { id: 'fallow', name: 'Fallow changed-diff audit', kind: 'fallow' },
  typegen: {
    id: 'typegen',
    name: 'Cloudflare type generation',
    command: 'bun',
    args: ['run', 'cf-typegen'],
  },
  typecheck: {
    id: 'typecheck',
    name: 'TypeScript',
    command: 'bun',
    args: ['run', 'typecheck'],
  },
  unit: {
    id: 'unit',
    name: 'Unit tests',
    command: 'bun',
    args: ['run', 'test'],
  },
  integration: {
    id: 'integration',
    name: 'Integration tests',
    command: 'bun',
    args: ['run', 'test:integration'],
  },
  build: {
    id: 'build',
    name: 'Production build',
    command: 'bun',
    args: ['run', 'build'],
  },
}

export function resolveQualityBase(value) {
  return value?.trim() || 'origin/main'
}

export function normalizeChangedPaths(paths) {
  return [...new Set(paths)].sort((left, right) => left.localeCompare(right))
}

function isDocsOnlyPath(path) {
  return (
    path.startsWith('docs/') ||
    rootMarkdownPattern.test(path) ||
    pullRequestMarkdownPattern.test(path)
  )
}

export function isDocsOnlyDiff(paths) {
  return paths.length === 0 || paths.every(isDocsOnlyPath)
}

function staticChecks(existingFiles, changedPaths) {
  const lintableFiles = existingFiles.filter((file) =>
    lintablePattern.test(file),
  )
  return [
    { ...commandCatalog.format, files: existingFiles },
    { ...commandCatalog.lint, files: lintableFiles },
    {
      ...commandCatalog.fallow,
      skip: !changedPaths.some((path) => fallowPathPattern.test(path)),
    },
  ]
}

function testChecks(docsOnly) {
  return ['typegen', 'typecheck', 'unit'].map((id) => ({
    ...commandCatalog[id],
    skip: docsOnly,
  }))
}

function releaseChecks(docsOnly) {
  return ['integration', 'build'].map((id) => ({
    ...commandCatalog[id],
    skip: docsOnly,
  }))
}

function deduplicateChecks(checks) {
  const seen = new Set()
  return checks.filter((check) => {
    if (seen.has(check.id)) return false
    seen.add(check.id)
    return true
  })
}

export function planVerification({
  mode,
  changedPaths,
  existingFiles,
  qualityBase = undefined,
}) {
  const paths = normalizeChangedPaths(changedPaths)
  const files = normalizeChangedPaths(existingFiles)
  const docsOnly = isDocsOnlyDiff(paths)
  const staticLane = staticChecks(files, paths)
  const testLane = testChecks(docsOnly)
  const selected =
    mode === 'static'
      ? staticLane
      : mode === 'test'
        ? testLane
        : mode === 'gate'
          ? [...staticLane, ...testLane]
          : [...staticLane, ...testLane, ...releaseChecks(docsOnly)]

  return {
    mode,
    base: resolveQualityBase(qualityBase),
    changedPaths: paths,
    existingFiles: files,
    docsOnly,
    checks: deduplicateChecks(selected),
  }
}
