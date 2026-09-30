const RELEASE_TAG_REF_PATTERNS = new Set(['v*', 'refs/tags/v*'])

function hasImmutableReleaseTagRuleset(rulesets) {
  return Array.isArray(rulesets) && rulesets.some(isImmutableReleaseTagRuleset)
}

function isImmutableReleaseTagRuleset(ruleset) {
  if (
    !ruleset ||
    ruleset.target !== 'tag' ||
    ruleset.enforcement !== 'active'
  ) {
    return false
  }

  const includes = ruleset.conditions?.ref_name?.include
  const protectsReleaseTags =
    Array.isArray(includes) &&
    includes.some((pattern) => RELEASE_TAG_REF_PATTERNS.has(pattern))
  const ruleTypes = new Set(
    Array.isArray(ruleset.rules) ? ruleset.rules.map((rule) => rule?.type) : [],
  )
  return (
    protectsReleaseTags && ruleTypes.has('deletion') && ruleTypes.has('update')
  )
}

module.exports = { hasImmutableReleaseTagRuleset }
