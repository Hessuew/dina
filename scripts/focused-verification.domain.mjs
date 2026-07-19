const codeFilePattern = /\.(?:[cm]?[jt]sx?)$/u
const fallowPathPattern = /^src\/(?:components|routes|utils)\//u
const integrationTestPattern = /^src\/.*\.integration\.test\.[cm]?[jt]sx?$/u
const integrationSourcePattern = /^src\//u

const fullIntegrationPatterns = [
  /^drizzle\//u,
  /^src\/db\//u,
  /^test\/integration\//u,
  /^vitest\.integration\.config\.[cm]?[jt]s$/u,
  /^drizzle\.config\.[cm]?[jt]s$/u,
  /^(?:package\.json|bun\.lockb?|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/u,
]

export function resolveQualityBase(value) {
  return value?.trim() || 'origin/main'
}

function isUnitRelatedFile(file) {
  if (!codeFilePattern.test(file) || integrationTestPattern.test(file)) {
    return false
  }

  return file.startsWith('src/') || file.startsWith('scripts/')
}

function isIntegrationRelatedFile(file) {
  return codeFilePattern.test(file) && integrationSourcePattern.test(file)
}

function requiresFullIntegration(file) {
  return fullIntegrationPatterns.some((pattern) => pattern.test(file))
}

export function planFocusedVerification(files, qualityBaseValue) {
  const changedFiles = [...new Set(files)].sort((left, right) =>
    left.localeCompare(right),
  )
  const fullIntegration = changedFiles.some(requiresFullIntegration)

  return {
    base: resolveQualityBase(qualityBaseValue),
    changedFiles,
    fallowApplicable: changedFiles.some((file) => fallowPathPattern.test(file)),
    unitRelatedFiles: changedFiles.filter(isUnitRelatedFile),
    integrationRelatedFiles: fullIntegration
      ? []
      : changedFiles.filter(isIntegrationRelatedFile),
    fullIntegration,
  }
}
