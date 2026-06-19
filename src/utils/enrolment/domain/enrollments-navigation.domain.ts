import type { EnrollmentSortKey } from '@/utils/enrolment/repository/enrolment.repository'

export type EnrollmentsNavParams = {
  page: number
  pageSize: number
  search: string
  sortBy: EnrollmentSortKey
  sortDir: 'asc' | 'desc'
}

export type EnrollmentsNavRequest = Partial<EnrollmentsNavParams>

export type EnrollmentsNavDecision =
  | { kind: 'noop' }
  | { kind: 'navigate'; next: EnrollmentsNavParams }

/**
 * Resolve the next enrollments-list navigation state from the current params and
 * a partial change request. Each unspecified field falls back to its current
 * value; if the resulting state is identical to the current one the navigation is
 * a no-op (the list should not reload).
 */
export function resolveEnrollmentsNavigation(
  current: EnrollmentsNavParams,
  request: EnrollmentsNavRequest,
): EnrollmentsNavDecision {
  const next: EnrollmentsNavParams = {
    page: request.page ?? current.page,
    pageSize: request.pageSize ?? current.pageSize,
    search: request.search ?? current.search,
    sortBy: request.sortBy ?? current.sortBy,
    sortDir: request.sortDir ?? current.sortDir,
  }

  const unchanged =
    next.page === current.page &&
    next.pageSize === current.pageSize &&
    next.search === current.search &&
    next.sortBy === current.sortBy &&
    next.sortDir === current.sortDir

  return unchanged ? { kind: 'noop' } : { kind: 'navigate', next }
}
