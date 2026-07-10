export type EnrollmentContactLookupCandidate = {
  enrollmentId: string
  fullLegalName: string
  preferredName: string | null
  email: string
  phoneWhatsApp: string
  status: string
}

export type EnrollmentContactLookupMatch = EnrollmentContactLookupCandidate & {
  score: number
  matchedName: string
}

export type EnrollmentContactLookupGroup = {
  query: string
  matches: Array<EnrollmentContactLookupMatch>
  suggestions: Array<EnrollmentContactLookupMatch>
}

export type EnrollmentContactLookupSelection = {
  enrollmentId: string
  email: string
}

const STRONG_MATCH_SCORE = 80
const SUGGESTION_SCORE = 45
const MAX_SUGGESTIONS = 3

export function parseEnrollmentContactLookupNames(raw: string): Array<string> {
  const seen = new Set<string>()
  const names: Array<string> = []

  for (const part of raw.split(/[,\n]+/)) {
    const name = part.trim().replace(/\s+/g, ' ')
    const key = normalizeName(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }

  return names
}

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function buildEnrollmentContactLookupGroups(
  queries: Array<string>,
  candidates: Array<EnrollmentContactLookupCandidate>,
): Array<EnrollmentContactLookupGroup> {
  return queries.map((query) => buildLookupGroup(query, candidates))
}

export function addEnrollmentContactLookupSelection<
  T extends EnrollmentContactLookupSelection,
>(selected: Array<T>, next: T): Array<T> {
  if (selected.some((item) => item.enrollmentId === next.enrollmentId)) {
    return selected
  }
  return [...selected, next]
}

export function removeEnrollmentContactLookupSelection<
  T extends EnrollmentContactLookupSelection,
>(selected: Array<T>, enrollmentId: string): Array<T> {
  return selected.filter((item) => item.enrollmentId !== enrollmentId)
}

function buildLookupGroup(
  query: string,
  candidates: Array<EnrollmentContactLookupCandidate>,
): EnrollmentContactLookupGroup {
  const ranked = candidates
    .map((candidate) => rankCandidate(query, candidate))
    .filter((match) => match.score >= SUGGESTION_SCORE)
    .sort(sortMatches)

  const matches = ranked.filter((match) => match.score >= STRONG_MATCH_SCORE)
  const suggestions =
    matches.length > 0
      ? []
      : ranked.filter((match) => match.score < STRONG_MATCH_SCORE)

  return {
    query,
    matches,
    suggestions: suggestions.slice(0, MAX_SUGGESTIONS),
  }
}

function rankCandidate(
  query: string,
  candidate: EnrollmentContactLookupCandidate,
): EnrollmentContactLookupMatch {
  const fullScore = scoreName(query, candidate.fullLegalName)
  const preferredScore = candidate.preferredName
    ? scoreName(query, candidate.preferredName)
    : 0
  const matchedName =
    preferredScore > fullScore && candidate.preferredName
      ? candidate.preferredName
      : candidate.fullLegalName

  return {
    ...candidate,
    score: Math.max(fullScore, preferredScore),
    matchedName,
  }
}

function sortMatches(
  a: EnrollmentContactLookupMatch,
  b: EnrollmentContactLookupMatch,
): number {
  if (b.score !== a.score) return b.score - a.score
  return a.fullLegalName.localeCompare(b.fullLegalName)
}

function scoreName(query: string, candidateName: string): number {
  const normalizedQuery = normalizeName(query)
  const normalizedName = normalizeName(candidateName)
  if (!normalizedQuery || !normalizedName) return 0
  if (normalizedQuery === normalizedName) return 100
  if (normalizedName.includes(normalizedQuery)) return 92
  if (normalizedQuery.includes(normalizedName) && normalizedName.length > 2) {
    return 86
  }

  return Math.max(
    scoreTokenCoverage(normalizedQuery, normalizedName),
    scoreEditSimilarity(normalizedQuery, normalizedName),
  )
}

function scoreTokenCoverage(query: string, candidateName: string): number {
  const queryTokens = query.split(' ')
  const candidateTokens = candidateName.split(' ')
  const hits = queryTokens.filter((token) =>
    candidateTokens.some(
      (candidateToken) =>
        candidateToken.includes(token) || token.includes(candidateToken),
    ),
  ).length
  if (hits === 0) return 0

  const coverage = hits / queryTokens.length
  if (coverage === 1) return 82
  return 55 + Math.round(coverage * 20)
}

function scoreEditSimilarity(query: string, candidateName: string): number {
  const maxLength = Math.max(query.length, candidateName.length)
  if (maxLength === 0) return 0
  const distance = levenshteinDistance(query, candidateName)
  return Math.round((1 - distance / maxLength) * 75)
}

function levenshteinDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i)

  for (let i = 1; i <= a.length; i += 1) {
    let beforeDiagonal = previous[0]
    previous[0] = i

    for (let j = 1; j <= b.length; j += 1) {
      const insert = previous[j] + 1
      const remove = previous[j - 1] + 1
      const replace = beforeDiagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
      beforeDiagonal = previous[j]
      previous[j] = Math.min(insert, remove, replace)
    }
  }

  return previous[b.length]
}
