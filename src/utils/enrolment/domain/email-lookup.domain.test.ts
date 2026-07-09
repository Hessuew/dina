import { describe, expect, it } from 'vitest'
import {
  addEnrollmentEmailLookupSelection,
  buildEnrollmentEmailLookupGroups,
  normalizeName,
  parseEnrollmentEmailLookupNames,
  removeEnrollmentEmailLookupSelection,
} from './email-lookup.domain'
import type { EnrollmentEmailLookupCandidate } from './email-lookup.domain'

const candidates: Array<EnrollmentEmailLookupCandidate> = [
  {
    enrollmentId: 'enrollment-1',
    fullLegalName: 'Maria Santos',
    preferredName: 'Mia',
    email: 'maria@test.dev',
    status: 'approved',
  },
  {
    enrollmentId: 'enrollment-2',
    fullLegalName: 'John Smith',
    preferredName: null,
    email: 'john@test.dev',
    status: 'pending',
  },
  {
    enrollmentId: 'enrollment-3',
    fullLegalName: 'Jane Smith',
    preferredName: null,
    email: 'jane@test.dev',
    status: 'approved',
  },
]

describe('parseEnrollmentEmailLookupNames', () => {
  it('parses comma and newline separated names', () => {
    expect(
      parseEnrollmentEmailLookupNames('Maria Santos, John Smith\nMia'),
    ).toEqual(['Maria Santos', 'John Smith', 'Mia'])
  })

  it('trims, collapses whitespace, and dedupes by normalized name', () => {
    expect(
      parseEnrollmentEmailLookupNames(' Maria   Santos , maria santos\nJOHN'),
    ).toEqual(['Maria Santos', 'JOHN'])
  })
})

describe('normalizeName', () => {
  it('normalizes case, accents, punctuation, and repeated whitespace', () => {
    expect(normalizeName(' María--  Santos ')).toBe('maria santos')
  })
})

describe('buildEnrollmentEmailLookupGroups', () => {
  it('matches full legal names strongly', () => {
    const [group] = buildEnrollmentEmailLookupGroups(
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
    const [group] = buildEnrollmentEmailLookupGroups(['Mia'], candidates)

    expect(group.matches[0]).toMatchObject({
      enrollmentId: 'enrollment-1',
      matchedName: 'Mia',
    })
  })

  it('returns multiple matches for ambiguous names', () => {
    const [group] = buildEnrollmentEmailLookupGroups(['Smith'], candidates)

    expect(group.matches.map((match) => match.email).sort()).toEqual([
      'jane@test.dev',
      'john@test.dev',
    ])
  })

  it('returns suggestions for unmatched fuzzy names', () => {
    const [group] = buildEnrollmentEmailLookupGroups(['Jon Smith'], candidates)

    expect(group.matches).toEqual([])
    expect(group.suggestions[0]).toMatchObject({
      enrollmentId: 'enrollment-2',
      email: 'john@test.dev',
    })
  })

  it('returns no matches or suggestions when nothing is close', () => {
    const [group] = buildEnrollmentEmailLookupGroups(['Zed Alpha'], candidates)

    expect(group).toMatchObject({
      query: 'Zed Alpha',
      matches: [],
      suggestions: [],
    })
  })
})

describe('email lookup selection helpers', () => {
  it('adds selections once by enrollment ID', () => {
    const selected = addEnrollmentEmailLookupSelection(
      [{ enrollmentId: 'enrollment-1', email: 'maria@test.dev' }],
      { enrollmentId: 'enrollment-1', email: 'maria@test.dev' },
    )

    expect(selected).toEqual([
      { enrollmentId: 'enrollment-1', email: 'maria@test.dev' },
    ])
  })

  it('removes a selected enrollment by ID', () => {
    const selected = removeEnrollmentEmailLookupSelection(
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
