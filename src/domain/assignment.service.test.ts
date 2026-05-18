import { describe, expect, it } from 'vitest'
import type { assignments, submissions } from '@/db/schema'
import {
  calculateAssignmentStats,
  canDeleteAssignment,
  filterAssignmentsForStudent,
  validateSubmissionWindow,
} from '@/domain/assignment.service'

type Assignment = typeof assignments.$inferSelect
type Submission = typeof submissions.$inferSelect

const makeAssignment = (
  overrides: Partial<Pick<Assignment, 'id' | 'status' | 'dueDate'>> = {},
): Assignment =>
  ({
    id: 'a-1',
    status: 'published',
    dueDate: new Date('2099-01-01'),
    ...overrides,
  }) as Assignment

const makeSubmission = (
  overrides: Partial<Pick<Submission, 'id' | 'status' | 'grade'>> = {},
): Submission =>
  ({
    id: 's-1',
    status: 'submitted',
    grade: null,
    ...overrides,
  }) as Submission

describe('validateSubmissionWindow', () => {
  it('does not throw for a published assignment with a future due date', () => {
    expect(() =>
      validateSubmissionWindow(makeAssignment(), new Date('2020-01-01')),
    ).not.toThrow()
  })

  it('throws when assignment is not published', () => {
    expect(() =>
      validateSubmissionWindow(
        makeAssignment({ status: 'draft' }),
        new Date('2020-01-01'),
      ),
    ).toThrow('Assignment is not open for submissions')
  })

  it('throws when due date has passed', () => {
    expect(() =>
      validateSubmissionWindow(
        makeAssignment({ dueDate: new Date('2020-01-01') }),
        new Date('2025-01-01'),
      ),
    ).toThrow('Assignment due date has passed')
  })
})

describe('canDeleteAssignment', () => {
  it('returns true when there are no submissions', () => {
    expect(canDeleteAssignment(makeAssignment(), [])).toBe(true)
  })

  it('returns false when submissions exist', () => {
    expect(canDeleteAssignment(makeAssignment(), [makeSubmission()])).toBe(
      false,
    )
  })
})

describe('calculateAssignmentStats', () => {
  it('returns zeros for an empty list', () => {
    expect(calculateAssignmentStats([])).toEqual({
      total: 0,
      submitted: 0,
      graded: 0,
    })
  })

  it('counts total, submitted, and graded correctly', () => {
    const result = calculateAssignmentStats([
      makeSubmission({ id: 's-1', status: 'submitted', grade: null }),
      makeSubmission({ id: 's-2', status: 'submitted', grade: 85 }),
      makeSubmission({ id: 's-3', status: 'draft', grade: null }),
    ])
    expect(result).toEqual({ total: 3, submitted: 2, graded: 1 })
  })
})

describe('filterAssignmentsForStudent', () => {
  it('returns only published assignments', () => {
    const result = filterAssignmentsForStudent([
      makeAssignment({ id: 'a-1', status: 'published' }),
      makeAssignment({ id: 'a-2', status: 'draft' }),
      makeAssignment({ id: 'a-3', status: 'published' }),
    ])
    expect(result).toHaveLength(2)
    expect(result.map((a) => a.id)).toEqual(['a-1', 'a-3'])
  })

  it('returns empty array when no assignments are published', () => {
    expect(
      filterAssignmentsForStudent([makeAssignment({ status: 'draft' })]),
    ).toEqual([])
  })
})
