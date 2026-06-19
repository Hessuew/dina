import { describe, expect, it } from 'vitest'
import { resolveEnrollmentsNavigation } from './enrollments-navigation.domain'
import type { EnrollmentsNavParams } from './enrollments-navigation.domain'

const current: EnrollmentsNavParams = {
  page: 2,
  pageSize: 20,
  search: 'alice',
  sortBy: 'createdAt',
  sortDir: 'desc',
}

describe('resolveEnrollmentsNavigation', () => {
  it('returns noop when the request changes nothing', () => {
    expect(resolveEnrollmentsNavigation(current, {})).toEqual({ kind: 'noop' })
  })

  it('returns noop when every requested value matches the current state', () => {
    expect(
      resolveEnrollmentsNavigation(current, {
        page: 2,
        pageSize: 20,
        search: 'alice',
        sortBy: 'createdAt',
        sortDir: 'desc',
      }),
    ).toEqual({ kind: 'noop' })
  })

  it('fills unspecified fields from the current state when navigating', () => {
    expect(resolveEnrollmentsNavigation(current, { page: 3 })).toEqual({
      kind: 'navigate',
      next: {
        page: 3,
        pageSize: 20,
        search: 'alice',
        sortBy: 'createdAt',
        sortDir: 'desc',
      },
    })
  })

  it('navigates when only the search term changes', () => {
    expect(resolveEnrollmentsNavigation(current, { page: 1, search: 'bob' })).toEqual({
      kind: 'navigate',
      next: {
        page: 1,
        pageSize: 20,
        search: 'bob',
        sortBy: 'createdAt',
        sortDir: 'desc',
      },
    })
  })

  it('navigates when only the sort changes', () => {
    expect(
      resolveEnrollmentsNavigation(current, {
        page: 1,
        sortBy: 'fullLegalName',
        sortDir: 'asc',
      }),
    ).toEqual({
      kind: 'navigate',
      next: {
        page: 1,
        pageSize: 20,
        search: 'alice',
        sortBy: 'fullLegalName',
        sortDir: 'asc',
      },
    })
  })

  it('navigates when only the page size changes', () => {
    expect(
      resolveEnrollmentsNavigation(current, { page: 1, pageSize: 50 }),
    ).toEqual({
      kind: 'navigate',
      next: {
        page: 1,
        pageSize: 50,
        search: 'alice',
        sortBy: 'createdAt',
        sortDir: 'desc',
      },
    })
  })

  it('treats an empty-string search request as a real value, not a fallback', () => {
    expect(resolveEnrollmentsNavigation(current, { search: '' })).toEqual({
      kind: 'navigate',
      next: {
        page: 2,
        pageSize: 20,
        search: '',
        sortBy: 'createdAt',
        sortDir: 'desc',
      },
    })
  })
})
