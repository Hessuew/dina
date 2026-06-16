import { describe, expect, it, vi } from 'vitest'
import {
  computeInitialIndex,
  computePosition,
  computeTotalPages,
  deriveHasNext,
  deriveHasPrev,
  groupEvaluations,
  navigateBackward,
  navigateForward,
  planBackward,
  planForward,
} from './enrollment-review.domain'
import type { EvaluationWithAuthor } from '@/utils/enrolment/repository/enrolment.repository'

function mkEval(
  enrollmentId: string,
  evaluatorId: string,
): EvaluationWithAuthor {
  return {
    enrollmentId,
    evaluatorId,
    evaluatorName: `name-${evaluatorId}`,
    score: null,
    admissionCategory: null,
    note: null,
  }
}

describe('groupEvaluations', () => {
  it('returns an empty map for no evaluations', () => {
    expect(groupEvaluations([]).size).toBe(0)
  })

  it('groups multiple evaluations under the same enrollment id in order', () => {
    const a1 = mkEval('a', '1')
    const a2 = mkEval('a', '2')
    const b1 = mkEval('b', '3')
    const map = groupEvaluations([a1, b1, a2])
    expect(map.get('a')).toEqual([a1, a2])
    expect(map.get('b')).toEqual([b1])
  })
})

describe('computeInitialIndex', () => {
  const list = [{ id: 'x' }, { id: 'y' }, { id: 'z' }]

  it('is null when no reviewId is given', () => {
    expect(computeInitialIndex(undefined, list)).toBeNull()
  })

  it('is the matching index when the reviewId is present', () => {
    expect(computeInitialIndex('y', list)).toBe(1)
  })

  it('is null when the reviewId is not in the list', () => {
    expect(computeInitialIndex('missing', list)).toBeNull()
  })
})

describe('computeTotalPages', () => {
  it('rounds up partial pages', () => {
    expect(computeTotalPages(25, 10)).toBe(3)
  })

  it('is at least 1 even with no items', () => {
    expect(computeTotalPages(0, 10)).toBe(1)
  })
})

describe('computePosition', () => {
  it('is 0 when closed', () => {
    expect(computePosition(null)).toBe(0)
  })

  it('is 1-based when open', () => {
    expect(computePosition(0)).toBe(1)
    expect(computePosition(4)).toBe(5)
  })
})

describe('deriveHasPrev', () => {
  it('is false when closed', () => {
    expect(deriveHasPrev(null, 5)).toBe(false)
  })

  it('is true when earlier in the loaded list', () => {
    expect(deriveHasPrev(2, 1)).toBe(true)
  })

  it('is true at list start when an earlier page exists', () => {
    expect(deriveHasPrev(0, 3)).toBe(true)
  })

  it('is false at the very beginning', () => {
    expect(deriveHasPrev(0, 1)).toBe(false)
  })
})

describe('deriveHasNext', () => {
  it('is false when closed', () => {
    expect(deriveHasNext(null, 10, 1, 5)).toBe(false)
  })

  it('is true when later in the loaded list', () => {
    expect(deriveHasNext(2, 10, 1, 1)).toBe(true)
  })

  it('is true at list end when a later page exists', () => {
    expect(deriveHasNext(9, 10, 1, 5)).toBe(true)
  })

  it('is false at the very end', () => {
    expect(deriveHasNext(9, 10, 5, 5)).toBe(false)
  })
})

describe('planForward', () => {
  it('is noop when closed', () => {
    expect(planForward(null, 10, 1, 5)).toEqual({ kind: 'noop' })
  })

  it('advances within the loaded list', () => {
    expect(planForward(2, 10, 1, 5)).toEqual({ kind: 'advance', nextIndex: 3 })
  })

  it('loads the next page at the list edge', () => {
    expect(planForward(9, 10, 1, 5)).toEqual({
      kind: 'load-append',
      targetPage: 2,
    })
  })

  it('is noop at the absolute end', () => {
    expect(planForward(9, 10, 5, 5)).toEqual({ kind: 'noop' })
  })
})

describe('planBackward', () => {
  it('is noop when closed', () => {
    expect(planBackward(null, 5)).toEqual({ kind: 'noop' })
  })

  it('retreats within the loaded list', () => {
    expect(planBackward(3, 1)).toEqual({ kind: 'retreat', prevIndex: 2 })
  })

  it('loads the previous page at the list start', () => {
    expect(planBackward(0, 3)).toEqual({
      kind: 'load-prepend',
      targetPage: 2,
    })
  })

  it('is noop at the absolute start', () => {
    expect(planBackward(0, 1)).toEqual({ kind: 'noop' })
  })
})

const refs = (...ids: Array<string>) => ids.map((id) => ({ id }))

function forwardDeps(
  over: Partial<Parameters<typeof navigateForward>[0]> = {},
) {
  return {
    index: 0,
    items: refs('a', 'b', 'c'),
    maxPage: 1,
    totalPages: 1,
    loadPage: vi.fn(async () => refs()),
    setIndex: vi.fn(),
    syncReviewParam: vi.fn(),
    onError: vi.fn(),
    ...over,
  }
}

function backwardDeps(
  over: Partial<Parameters<typeof navigateBackward>[0]> = {},
) {
  return {
    index: 1,
    items: refs('a', 'b', 'c'),
    minPage: 1,
    loadPage: vi.fn(async () => refs()),
    setIndex: vi.fn(),
    syncReviewParam: vi.fn(),
    onError: vi.fn(),
    ...over,
  }
}

describe('navigateForward', () => {
  it('does nothing when closed', async () => {
    const deps = forwardDeps({ index: null })
    await navigateForward(deps)
    expect(deps.setIndex).not.toHaveBeenCalled()
    expect(deps.loadPage).not.toHaveBeenCalled()
    expect(deps.syncReviewParam).not.toHaveBeenCalled()
  })

  it('advances within the loaded list without loading', async () => {
    const deps = forwardDeps({ index: 0 })
    await navigateForward(deps)
    expect(deps.setIndex).toHaveBeenCalledWith(1)
    expect(deps.syncReviewParam).toHaveBeenCalledWith('b')
    expect(deps.loadPage).not.toHaveBeenCalled()
  })

  it('does nothing at the absolute end', async () => {
    const deps = forwardDeps({ index: 2, maxPage: 1, totalPages: 1 })
    await navigateForward(deps)
    expect(deps.setIndex).not.toHaveBeenCalled()
    expect(deps.loadPage).not.toHaveBeenCalled()
  })

  it('appends the next page at the edge and steps onto it', async () => {
    const loadPage = vi.fn(async () => refs('d', 'e'))
    const setIndex = vi.fn()
    const deps = forwardDeps({
      index: 2,
      maxPage: 1,
      totalPages: 2,
      loadPage,
      setIndex,
    })
    await navigateForward(deps)
    expect(loadPage).toHaveBeenCalledWith(2, 'append')
    const updater = setIndex.mock.calls[0][0] as (
      c: number | null,
    ) => number | null
    expect(updater(2)).toBe(3)
    expect(updater(null)).toBeNull()
    expect(deps.syncReviewParam).toHaveBeenCalledWith('d')
  })

  it('stops if the appended page is empty', async () => {
    const deps = forwardDeps({ index: 2, maxPage: 1, totalPages: 2 })
    await navigateForward(deps)
    expect(deps.setIndex).not.toHaveBeenCalled()
    expect(deps.syncReviewParam).not.toHaveBeenCalled()
  })

  it('reports an error when the page load fails', async () => {
    const loadPage = vi.fn(async () => {
      throw new Error('boom')
    })
    const deps = forwardDeps({ index: 2, maxPage: 1, totalPages: 2, loadPage })
    await navigateForward(deps)
    expect(deps.onError).toHaveBeenCalledWith('Failed to load next page')
  })
})

describe('navigateBackward', () => {
  it('does nothing when closed', async () => {
    const deps = backwardDeps({ index: null })
    await navigateBackward(deps)
    expect(deps.setIndex).not.toHaveBeenCalled()
    expect(deps.loadPage).not.toHaveBeenCalled()
  })

  it('retreats within the loaded list without loading', async () => {
    const deps = backwardDeps({ index: 1 })
    await navigateBackward(deps)
    expect(deps.setIndex).toHaveBeenCalledWith(0)
    expect(deps.syncReviewParam).toHaveBeenCalledWith('a')
    expect(deps.loadPage).not.toHaveBeenCalled()
  })

  it('does nothing at the absolute start', async () => {
    const deps = backwardDeps({ index: 0, minPage: 1 })
    await navigateBackward(deps)
    expect(deps.setIndex).not.toHaveBeenCalled()
    expect(deps.loadPage).not.toHaveBeenCalled()
  })

  it('prepends the previous page at the start and steps onto its last item', async () => {
    const loadPage = vi.fn(async () => refs('x', 'y'))
    const setIndex = vi.fn()
    const deps = backwardDeps({ index: 0, minPage: 2, loadPage, setIndex })
    await navigateBackward(deps)
    expect(loadPage).toHaveBeenCalledWith(1, 'prepend')
    const updater = setIndex.mock.calls[0][0] as (
      c: number | null,
    ) => number | null
    expect(updater(0)).toBe(1)
    expect(updater(null)).toBeNull()
    expect(deps.syncReviewParam).toHaveBeenCalledWith('y')
  })

  it('stops if the prepended page is empty', async () => {
    const deps = backwardDeps({ index: 0, minPage: 2 })
    await navigateBackward(deps)
    expect(deps.setIndex).not.toHaveBeenCalled()
    expect(deps.syncReviewParam).not.toHaveBeenCalled()
  })

  it('reports an error when the page load fails', async () => {
    const loadPage = vi.fn(async () => {
      throw new Error('boom')
    })
    const deps = backwardDeps({ index: 0, minPage: 2, loadPage })
    await navigateBackward(deps)
    expect(deps.onError).toHaveBeenCalledWith('Failed to load previous page')
  })
})
