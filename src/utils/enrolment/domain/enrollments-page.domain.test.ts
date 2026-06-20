import { describe, expect, it } from 'vitest'
import {
  buildDistributeToastMessage,
  buildSortChangeRequest,
  getViewAllButtonProps,
  resolveIsAdmin,
  resolveReviewOverlayContext,
  resolveSearchChange,
} from './enrollments-page.domain'

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
