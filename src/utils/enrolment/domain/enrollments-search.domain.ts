import type { EnrollmentSortKey } from '@/utils/enrolment/repository/enrolment.repository'
import { ENROLLMENT_SORT_KEYS } from '@/schemas/enrollment.schema'

const PAGE_SIZES: Array<number> = [10, 20, 50, 100]

export type EnrollmentsSearch = {
  page: number
  pageSize: number
  search: string
  sortBy: EnrollmentSortKey
  sortDir: 'asc' | 'desc'
  review: string | undefined
  viewAll: boolean
}

/**
 * Validate and normalize the enrollments route search params, falling back to
 * safe defaults for any missing or malformed value.
 */
export function parseEnrollmentsSearch(
  search: Record<string, unknown>,
): EnrollmentsSearch {
  return {
    page: typeof search.page === 'number' && search.page > 0 ? search.page : 1,
    pageSize: PAGE_SIZES.includes(Number(search.pageSize))
      ? Number(search.pageSize)
      : 10,
    search: typeof search.search === 'string' ? search.search : '',
    sortBy: ENROLLMENT_SORT_KEYS.includes(search.sortBy as EnrollmentSortKey)
      ? (search.sortBy as EnrollmentSortKey)
      : 'createdAt',
    sortDir:
      search.sortDir === 'asc' || search.sortDir === 'desc'
        ? search.sortDir
        : 'desc',
    review: typeof search.review === 'string' ? search.review : undefined,
    viewAll: typeof search.viewAll === 'boolean' ? search.viewAll : false,
  }
}
