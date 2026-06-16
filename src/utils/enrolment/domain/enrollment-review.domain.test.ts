import { describe, expect, it } from 'vitest'
import type { EvaluationWithAuthor } from '../repository/enrolment.repository'
import {
  computeInitialIndex,
  computePosition,
  computeTotalPages,
  deriveHasNext,
  deriveHasPrev,
  groupEvaluations,
  planBackward,
  planForward,
} from './enrollment-review.domain'

function mkEval(enrollmentId: string, evaluatorId: string): EvaluationWithAuthor {
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
