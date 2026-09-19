import { describe, expect, it } from 'vitest'
import {
  attachEnrollmentEvaluationTotals,
  buildDistributeToastMessage,
  buildSortChangeRequest,
  getViewAllButtonProps,
  orderEnrollmentRowsByIds,
  resolveCanExportContacts,
  resolveIsAdmin,
  resolveReviewOverlayContext,
  resolveSearchChange,
  sortEnrollmentIdsByEvaluation,
} from './enrollments-page.domain'
import type { EnrollmentTableRow } from './enrollments-page.domain'

const enrollmentRow = (id: string, createdAt: string) =>
  ({ id, createdAt: new Date(createdAt) }) as EnrollmentTableRow

describe('enrollment page table composition', () => {
  it('attaches totals and defaults missing evaluation rows to zero', () => {
    const rows = [enrollmentRow('one', '2026-01-01T00:00:00.000Z')]

    expect(
      attachEnrollmentEvaluationTotals(rows, [
        { enrollmentId: 'one', evaluationSum: 5, evaluationCount: 2 },
      ]),
    ).toMatchObject([{ id: 'one', evaluationSum: 5, evaluationCount: 2 }])
    expect(
      attachEnrollmentEvaluationTotals(
        [enrollmentRow('missing', '2026-01-02T00:00:00.000Z')],
        [],
      ),
    ).toMatchObject([{ id: 'missing', evaluationSum: 0, evaluationCount: 0 }])
  })

  it('sorts evaluation totals in both directions and breaks ties by newest enrollment', () => {
    const candidates = [
      { id: 'older', createdAt: new Date('2026-01-01T00:00:00.000Z') },
      { id: 'newer', createdAt: new Date('2026-01-02T00:00:00.000Z') },
      { id: 'highest', createdAt: new Date('2026-01-03T00:00:00.000Z') },
    ]
    const totals = [
      { enrollmentId: 'older', evaluationSum: 2, evaluationCount: 1 },
      { enrollmentId: 'newer', evaluationSum: 2, evaluationCount: 1 },
      { enrollmentId: 'highest', evaluationSum: 4, evaluationCount: 1 },
    ]

    expect(sortEnrollmentIdsByEvaluation(candidates, totals, 'asc')).toEqual([
      'newer',
      'older',
      'highest',
    ])
    expect(sortEnrollmentIdsByEvaluation(candidates, totals, 'desc')).toEqual([
      'highest',
      'newer',
      'older',
    ])
  })

  it('restores database row order from the selected enrollment IDs', () => {
    const rows = [
      enrollmentRow('first', '2026-01-01T00:00:00.000Z'),
      enrollmentRow('second', '2026-01-02T00:00:00.000Z'),
    ]

    expect(
      orderEnrollmentRowsByIds(rows, ['second', 'missing', 'first']),
    ).toEqual([rows[1], rows[0]])
  })
})

describe('buildDistributeToastMessage', () => {
  it('reports a plural count when several enrollments are distributed', () => {
    expect(buildDistributeToastMessage(3)).toBe('Distributed 3 enrollments')
  })

  it('uses the singular noun for exactly one enrollment', () => {
    expect(buildDistributeToastMessage(1)).toBe('Distributed 1 enrollment')
  })

  it('reports nothing to distribute when the count is zero', () => {
    expect(buildDistributeToastMessage(0)).toBe(
      'No unassigned enrollments to distribute',
    )
  })
})

describe('buildSortChangeRequest', () => {
  it('passes the chosen column and direction through', () => {
    expect(buildSortChangeRequest('name', 'asc')).toEqual({
      page: 1,
      sortBy: 'name',
      sortDir: 'asc',
    })
  })

  it('falls back to the default column and descending order when cleared', () => {
    expect(buildSortChangeRequest(null, 'asc')).toEqual({
      page: 1,
      sortBy: 'createdAt',
      sortDir: 'desc',
    })
  })
})

describe('resolveSearchChange', () => {
  it('is a no-op when the search term is unchanged', () => {
    expect(resolveSearchChange('term', 'term')).toEqual({ kind: 'noop' })
  })

  it('requests a reset to page 1 with the new term when it changes', () => {
    expect(resolveSearchChange('next', 'prev')).toEqual({
      kind: 'search',
      request: { page: 1, search: 'next' },
    })
  })
})

describe('resolveIsAdmin', () => {
  it('is true for an admin user', () => {
    expect(resolveIsAdmin({ role: 'admin' })).toBe(true)
  })

  it('is false for a non-admin role', () => {
    expect(resolveIsAdmin({ role: 'teacher' })).toBe(false)
  })

  it('is false when there is no user', () => {
    expect(resolveIsAdmin(null)).toBe(false)
    expect(resolveIsAdmin(undefined)).toBe(false)
  })
})

describe('resolveCanExportContacts', () => {
  it('is true for an Admin', () => {
    expect(resolveCanExportContacts(true, false)).toBe(true)
  })

  it('is true for a privileged Teacher-user', () => {
    expect(resolveCanExportContacts(false, true)).toBe(true)
  })

  it('is false for a plain Teacher-user', () => {
    expect(resolveCanExportContacts(false, false)).toBe(false)
    expect(resolveCanExportContacts(false, undefined)).toBe(false)
  })
})

describe('getViewAllButtonProps', () => {
  it('shows the default variant and "Show Own" while viewing all', () => {
    expect(getViewAllButtonProps(true)).toEqual({
      variant: 'default',
      label: 'Show Own',
    })
  })

  it('shows the outline variant and "View All" while viewing own', () => {
    expect(getViewAllButtonProps(false)).toEqual({
      variant: 'outline',
      label: 'View All',
    })
  })
})

describe('resolveReviewOverlayContext', () => {
  const user = { id: 'u1', email: 'u1@example.com', fullName: 'Ada Lovelace' }
  const current = { id: 'e1' }

  it('returns null when the overlay is closed', () => {
    expect(
      resolveReviewOverlayContext({ isOpen: false, current, user }),
    ).toBeNull()
  })

  it('returns null when there is no current enrollment', () => {
    expect(
      resolveReviewOverlayContext({ isOpen: true, current: null, user }),
    ).toBeNull()
  })

  it('returns null when there is no user', () => {
    expect(
      resolveReviewOverlayContext({ isOpen: true, current, user: null }),
    ).toBeNull()
  })

  it('returns the enrollment, user id and full-name evaluator when open', () => {
    expect(
      resolveReviewOverlayContext({ isOpen: true, current, user }),
    ).toEqual({
      enrollment: current,
      userId: 'u1',
      evaluatorName: 'Ada Lovelace',
    })
  })

  it('falls back to the email when the user has no full name', () => {
    expect(
      resolveReviewOverlayContext({
        isOpen: true,
        current,
        user: { id: 'u2', email: 'u2@example.com', fullName: null },
      }),
    ).toEqual({
      enrollment: current,
      userId: 'u2',
      evaluatorName: 'u2@example.com',
    })
  })
})
