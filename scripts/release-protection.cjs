const RELEASE_TAG_REF_PATTERNS = new Set(['v*', 'refs/tags/v*'])

function normalizeRulesetDetails(summaryRulesets, detailResponses) {
  const summaries = Array.isArray(summaryRulesets) ? summaryRulesets : []
  const details = Array.isArray(detailResponses) ? detailResponses : []
  const detailsById = new Map()

  for (const response of details) {
    const detail = response?.data ?? response
    const id = detail?.id
    if (typeof id === 'number' || (typeof id === 'string' && id.length > 0)) {
      detailsById.set(String(id), detail)
    }
  }

  return summaries
    .map((summary) => detailsById.get(String(summary?.id)))
    .filter(Boolean)
}

function hasImmutableReleaseTagRuleset(rulesets) {
  return Array.isArray(rulesets) && rulesets.some(isImmutableReleaseTagRuleset)
}

function isImmutableReleaseTagRuleset(ruleset) {
  return (
    hasActiveTagTarget(ruleset) &&
    hasCompleteReleaseTagScope(ruleset) &&
    hasImmutableRules(ruleset)
  )
}

function hasActiveTagTarget(ruleset) {
  return Boolean(
    ruleset && ruleset.target === 'tag' && ruleset.enforcement === 'active',
  )
}

function hasCompleteReleaseTagScope(ruleset) {
  const includes = ruleset.conditions?.ref_name?.include
  const excludes = ruleset.conditions?.ref_name?.exclude
  const bypassActors = ruleset.bypass_actors
  return Boolean(
    Array.isArray(includes) &&
    includes.some((pattern) => RELEASE_TAG_REF_PATTERNS.has(pattern)) &&
    Array.isArray(excludes) &&
    excludes.length === 0 &&
    Array.isArray(bypassActors) &&
    bypassActors.length === 0,
  )
}

function hasImmutableRules(ruleset) {
  const ruleTypes = new Set(
    Array.isArray(ruleset.rules) ? ruleset.rules.map((rule) => rule?.type) : [],
  )
  return ruleTypes.has('deletion') && ruleTypes.has('update')
}

module.exports = { hasImmutableReleaseTagRuleset, normalizeRulesetDetails }
