const {
  isReleaseTag,
  parseTrustedReleaseBinding,
} = require('./release-record.cjs')

async function collectTrustedReleaseBindings({
  releases,
  mainGateRuns,
  productionRuns,
  deployments,
  getTagCommit,
}) {
  const bindings = {}
  for (const release of Array.isArray(releases) ? releases : []) {
    if (!isReleaseTag(release?.tag_name)) continue
    let tagCommit
    try {
      tagCommit = await getTagCommit(release.tag_name)
    } catch {
      continue
    }
    const binding = parseTrustedReleaseBinding(release, tagCommit, {
      mainGateRuns,
      productionRuns,
      deployments,
    })
    if (binding) bindings[release.tag_name] = binding
  }
  return bindings
}

function isSupportedManualPromotionTarget(targetSha, currentMainSha, bindings) {
  const target = normalizeSha(targetSha)
  const currentMain = normalizeSha(currentMainSha)
  if (!target || !currentMain) return false
  if (target === currentMain) return true
  return Object.values(bindings ?? {}).some(
    (binding) => normalizeSha(binding?.commitSha) === target,
  )
}

function normalizeSha(value) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return /^[0-9a-f]{40}$/u.test(normalized) ? normalized : null
}

module.exports = {
  collectTrustedReleaseBindings,
  isSupportedManualPromotionTarget,
}
