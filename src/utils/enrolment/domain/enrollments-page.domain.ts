import type { EnrollmentSortKey } from '@/utils/enrolment/repository/enrolment.repository'
import type { EnrollmentsNavRequest } from '@/utils/enrolment/domain/enrollments-navigation.domain'

/**
 * Toast message for the "distribute unassigned enrollments" action, pluralizing
 * the noun and falling back to a no-op message when nothing was distributed.
 */
export function buildDistributeToastMessage(assigned: number): string {
  if (assigned > 0) {
    return `Distributed ${assigned} enrollment${assigned === 1 ? '' : 's'}`
  }
  return 'No unassigned enrollments to distribute'
}

/**
 * Navigation request for a table sort change. Clearing the sort (`sortBy === null`)
 * resets to the default column in descending order; otherwise the chosen column and
 * direction are used. Always resets to the first page.
 */
export function buildSortChangeRequest(
  sortBy: string | null,
  sortDir: 'asc' | 'desc',
): EnrollmentsNavRequest {
  return {
    page: 1,
    sortBy: (sortBy ?? 'createdAt') as EnrollmentSortKey,
    sortDir: sortBy ? sortDir : 'desc',
  }
}

/** Whether the current user has the admin role. */
export function resolveIsAdmin(
  user: { role?: string | null } | null | undefined,
): boolean {
  return user?.role === 'admin'
}

/** Button variant + label for the view-all / view-own toggle. */
export function getViewAllButtonProps(viewAll: boolean): {
  variant: 'default' | 'outline'
  label: string
} {
  return {
    variant: viewAll ? 'default' : 'outline',
    label: viewAll ? 'Show Own' : 'View All',
  }
}

export type ReviewOverlayContext<TEnrollment> = {
  enrollment: TEnrollment
  userId: string
  evaluatorName: string
}

/**
 * Resolve the review-overlay rendering context: the overlay shows only when it is
 * open, an enrollment is current, and a user is present. When it does, derive the
 * non-null enrollment, the reviewer's id, and a display name (full name, falling
 * back to email). Returns `null` when the overlay should not render.
 */
export function resolveReviewOverlayContext<TEnrollment>(args: {
  isOpen: boolean
  current: TEnrollment | null | undefined
  user:
    | { id: string; email: string; fullName?: string | null }
    | null
    | undefined
}): ReviewOverlayContext<TEnrollment> | null {
  if (!args.isOpen || !args.current || !args.user) {
    return null
  }
  return {
    enrollment: args.current,
    userId: args.user.id,
    evaluatorName: args.user.fullName ?? args.user.email,
  }
}

export type SearchChangeDecision =
  | { kind: 'noop' }
  | { kind: 'search'; request: EnrollmentsNavRequest }

/**
 * Decide how a search-input change should drive navigation: an unchanged term is a
 * no-op (no reload), a changed term requests a reset to page 1 with the new term.
 */
export function resolveSearchChange(
  nextSearch: string,
  currentSearch: string,
): SearchChangeDecision {
  if (nextSearch === currentSearch) {
    return { kind: 'noop' }
  }
  return { kind: 'search', request: { page: 1, search: nextSearch } }
}
