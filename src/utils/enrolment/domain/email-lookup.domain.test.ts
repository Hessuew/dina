import { describe, expect, it } from 'vitest'
import {
  addEnrollmentContactLookupSelection,
  buildEnrollmentContactLookupGroups,
  mergeUniqueStrongEnrollmentContactMatches,
  normalizeName,
  parseEnrollmentContactLookupNames,
  removeEnrollmentContactLookupSelection,
} from './email-lookup.domain'
import type {
  EnrollmentContactLookupCandidate,
  EnrollmentContactLookupMatch,
} from './email-lookup.domain'

const candidates: Array<EnrollmentContactLookupCandidate> = [
  {
    enrollmentId: 'enrollment-1',
    fullLegalName: 'Maria Santos',
    preferredName: 'Mia',
    email: 'maria@test.dev',
    phoneWhatsApp: '+358401234567',
    status: 'approved',
  },
  {
    enrollmentId: 'enrollment-2',
    fullLegalName: 'John Smith',
    preferredName: null,
    email: 'john@test.dev',
    phoneWhatsApp: '+14155552671',
    status: 'pending',
  },
  {
    enrollmentId: 'enrollment-3',
    fullLegalName: 'Jane Smith',
    preferredName: null,
    email: 'jane@test.dev',
    phoneWhatsApp: '+358401234568',
    status: 'approved',
  },
]

describe('parseEnrollmentContactLookupNames', () => {
  it('parses comma and newline separated names', () => {
    expect(
      parseEnrollmentContactLookupNames('Maria Santos, John Smith\nMia'),
    ).toEqual(['Maria Santos', 'John Smith', 'Mia'])
  })

  it('trims, collapses whitespace, and dedupes by normalized name', () => {
    expect(
      parseEnrollmentContactLookupNames(' Maria   Santos , maria santos\nJOHN'),
    ).toEqual(['Maria Santos', 'JOHN'])
  })
})

describe('normalizeName', () => {
  it('normalizes case, accents, punctuation, and repeated whitespace', () => {
    expect(normalizeName(' María--  Santos ')).toBe('maria santos')
  })
})

describe('buildEnrollmentContactLookupGroups', () => {
  it('matches full legal names strongly', () => {
    const [group] = buildEnrollmentContactLookupGroups(
      ['Maria Santos'],
      candidates,
    )

    expect(group.matches).toHaveLength(1)
    expect(group.matches[0]).toMatchObject({
      enrollmentId: 'enrollment-1',
      email: 'maria@test.dev',
      matchedName: 'Maria Santos',
    })
    expect(group.suggestions).toEqual([])
  })

  it('matches preferred names strongly', () => {
    const [group] = buildEnrollmentContactLookupGroups(['Mia'], candidates)

    expect(group.matches[0]).toMatchObject({
      enrollmentId: 'enrollment-1',
      matchedName: 'Mia',
    })
  })

  it('returns multiple matches for ambiguous names', () => {
    const [group] = buildEnrollmentContactLookupGroups(['Smith'], candidates)

    expect(group.matches.map((match) => match.email).sort()).toEqual([
      'jane@test.dev',
      'john@test.dev',
    ])
  })

  it('returns suggestions for unmatched fuzzy names', () => {
    const [group] = buildEnrollmentContactLookupGroups(
      ['Jon Smith'],
      candidates,
    )

    expect(group.matches).toEqual([])
    expect(group.suggestions[0]).toMatchObject({
      enrollmentId: 'enrollment-2',
      email: 'john@test.dev',
    })
  })

  it('returns no matches or suggestions when nothing is close', () => {
    const [group] = buildEnrollmentContactLookupGroups(
      ['Zed Alpha'],
      candidates,
    )

    expect(group).toMatchObject({
      query: 'Zed Alpha',
      matches: [],
      suggestions: [],
    })
  })
})

describe('email lookup selection helpers', () => {
  it('adds selections once by enrollment ID', () => {
    const selected = addEnrollmentContactLookupSelection(
      [{ enrollmentId: 'enrollment-1', email: 'maria@test.dev' }],
      { enrollmentId: 'enrollment-1', email: 'maria@test.dev' },
    )

    expect(selected).toEqual([
      { enrollmentId: 'enrollment-1', email: 'maria@test.dev' },
    ])
  })

  it('removes a selected enrollment by ID', () => {
    const selected = removeEnrollmentContactLookupSelection(
      [
        { enrollmentId: 'enrollment-1', email: 'maria@test.dev' },
        { enrollmentId: 'enrollment-2', email: 'john@test.dev' },
      ],
      'enrollment-1',
    )

    expect(selected).toEqual([
      { enrollmentId: 'enrollment-2', email: 'john@test.dev' },
    ])
  })
})

describe('mergeUniqueStrongEnrollmentContactMatches', () => {
  it('auto-selects unique strong matches only', () => {
    const groups = buildEnrollmentContactLookupGroups(
      ['Maria Santos', 'Smith', 'Jon Smith', 'Zed Alpha'],
      candidates,
    )

    const selected = mergeUniqueStrongEnrollmentContactMatches([], groups)

    expect(selected.map((match) => match.enrollmentId)).toEqual([
      'enrollment-1',
    ])
  })

  it('merge-adds without clearing existing selections', () => {
    const existing: Array<EnrollmentContactLookupMatch> = [
      {
        ...candidates[1],
        score: 100,
        matchedName: 'John Smith',
      },
    ]
    const groups = buildEnrollmentContactLookupGroups(
      ['Maria Santos'],
      candidates,
    )

    const selected = mergeUniqueStrongEnrollmentContactMatches(existing, groups)

    expect(selected.map((match) => match.enrollmentId)).toEqual([
      'enrollment-2',
      'enrollment-1',
    ])
  })

  it('dedupes the same enrollment matched by two queries', () => {
    const groups = buildEnrollmentContactLookupGroups(
      ['Maria Santos', 'Mia'],
      candidates,
    )

    const selected = mergeUniqueStrongEnrollmentContactMatches([], groups)

    expect(selected).toHaveLength(1)
    expect(selected[0]?.enrollmentId).toBe('enrollment-1')
  })

  it('does not auto-select from suggestions alone', () => {
    const groups = buildEnrollmentContactLookupGroups(['Jon Smith'], candidates)

    expect(groups[0]?.matches).toEqual([])
    expect(groups[0]?.suggestions.length).toBeGreaterThan(0)
    expect(mergeUniqueStrongEnrollmentContactMatches([], groups)).toEqual([])
  })

  it('auto-selects unique exact match when multiple strong matches exist', () => {
    const twins: Array<EnrollmentContactLookupCandidate> = [
      ...candidates,
      {
        enrollmentId: 'enrollment-4',
        fullLegalName: 'John Smith Jr',
        preferredName: null,
        email: 'johnjr@test.dev',
        phoneWhatsApp: '+14155552672',
        status: 'approved',
      },
    ]
    // "John Smith" exact-matches enrollment-2 (score 100) and also strong-matches
    // "John Smith Jr" via substring/token coverage.
    const groups = buildEnrollmentContactLookupGroups(['John Smith'], twins)
    expect(groups[0]?.matches.length).toBeGreaterThan(1)
    expect(
      groups[0]?.matches.some(
        (match) => match.enrollmentId === 'enrollment-2' && match.score === 100,
      ),
    ).toBe(true)

    const selected = mergeUniqueStrongEnrollmentContactMatches([], groups)

    expect(selected.map((match) => match.enrollmentId)).toEqual([
      'enrollment-2',
    ])
  })

  it('does not auto-select when multiple exact matches share a query', () => {
    const duplicates: Array<EnrollmentContactLookupCandidate> = [
      candidates[0],
      {
        ...candidates[0],
        enrollmentId: 'enrollment-1b',
        email: 'maria2@test.dev',
      },
    ]
    const groups = buildEnrollmentContactLookupGroups(
      ['Maria Santos'],
      duplicates,
    )
    expect(
      groups[0]?.matches.filter((match) => match.score === 100),
    ).toHaveLength(2)

    expect(mergeUniqueStrongEnrollmentContactMatches([], groups)).toEqual([])
  })
})
