import type { EvaluationWithAuthor } from '../repository/enrolment.repository'

export type EvalMap = Map<string, Array<EvaluationWithAuthor>>

/** Group evaluations by their enrollment id, preserving insertion order. */
export function groupEvaluations(evals: Array<EvaluationWithAuthor>): EvalMap {
  const map: EvalMap = new Map()
  for (const evaluation of evals) {
    const list = map.get(evaluation.enrollmentId)
    if (list) list.push(evaluation)
    else map.set(evaluation.enrollmentId, [evaluation])
  }
  return map
}

/**
 * Resolve the carousel's starting index from the `?review` id: the position of
 * that enrollment in the seeded list, or null when absent / not found.
 */
export function computeInitialIndex(
  reviewId: string | undefined,
  enrollments: Array<{ id: string }>,
): number | null {
  if (!reviewId) return null
  const i = enrollments.findIndex((e) => e.id === reviewId)
  return i >= 0 ? i : null
}

/** Total number of pages for a result set, never less than 1. */
export function computeTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

/** A previous item exists either earlier in the loaded list or on an earlier page. */
export function deriveHasPrev(index: number | null, minPage: number): boolean {
  return index !== null && (index > 0 || minPage > 1)
}

/** A next item exists either later in the loaded list or on a later page. */
export function deriveHasNext(
  index: number | null,
  itemCount: number,
  maxPage: number,
  totalPages: number,
): boolean {
  return index !== null && (index < itemCount - 1 || maxPage < totalPages)
}

/** 1-based position of the open item, or 0 when the carousel is closed. */
export function computePosition(index: number | null): number {
  return index !== null ? index + 1 : 0
}

export type ForwardPlan =
  | { kind: 'noop' }
  | { kind: 'advance'; nextIndex: number }
  | { kind: 'load-append'; targetPage: number }

/**
 * Decide how to move forward: step within loaded items, fetch+append the next
 * page when at the edge, or do nothing when closed / already at the very end.
 */
export function planForward(
  index: number | null,
  itemCount: number,
  maxPage: number,
  totalPages: number,
): ForwardPlan {
  if (index === null) return { kind: 'noop' }
  if (index < itemCount - 1) return { kind: 'advance', nextIndex: index + 1 }
  if (maxPage < totalPages) {
    return { kind: 'load-append', targetPage: maxPage + 1 }
  }
  return { kind: 'noop' }
}

export type BackwardPlan =
  | { kind: 'noop' }
  | { kind: 'retreat'; prevIndex: number }
  | { kind: 'load-prepend'; targetPage: number }

/**
 * Decide how to move backward: step within loaded items, fetch+prepend the
 * previous page when at the edge, or do nothing when closed / at the start.
 */
export function planBackward(
  index: number | null,
  minPage: number,
): BackwardPlan {
  if (index === null) return { kind: 'noop' }
  if (index > 0) return { kind: 'retreat', prevIndex: index - 1 }
  if (minPage > 1) return { kind: 'load-prepend', targetPage: minPage - 1 }
  return { kind: 'noop' }
}
