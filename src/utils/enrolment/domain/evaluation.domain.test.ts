import { describe, expect, it } from 'vitest'
import {
  applyEvaluationPatch,
  formatEvaluationSummary,
  formatScore,
  reduceScoreKey,
  scoreRequiresAdmissionCategory,
} from './evaluation.domain'
import type { EvaluationEntry } from './evaluation.domain'

describe('reduceScoreKey', () => {
  it('sets a score on a digit press', () => {
    const result = reduceScoreKey(null, '4')
    expect(result).toEqual({
      score: 4,
      handled: true,
      changed: true,
    })
  })

  it('treats 0 as a valid rejected score', () => {
    const result = reduceScoreKey(null, '0')
    expect(result.score).toBe(0)
    expect(result.changed).toBe(true)
  })

  it('does not handle scores outside the rubric', () => {
    const result = reduceScoreKey(null, '5')
    expect(result.handled).toBe(false)
    expect(result.changed).toBe(false)
    expect(result.score).toBeNull()
  })

  it('does not handle the negative arm key', () => {
    const result = reduceScoreKey(3, '-')
    expect(result).toEqual({
      score: 3,
      handled: false,
      changed: false,
    })
  })

  it('clears when re-pressing the active value', () => {
    const result = reduceScoreKey(4, '4')
    expect(result.score).toBeNull()
    expect(result.changed).toBe(true)
  })

  it('clears on Backspace when a score is set', () => {
    const result = reduceScoreKey(4, 'Backspace')
    expect(result).toEqual({
      score: null,
      handled: true,
      changed: true,
    })
  })

  it('reports no change on Backspace when already empty', () => {
    const result = reduceScoreKey(null, 'Backspace')
    expect(result.score).toBeNull()
    expect(result.changed).toBe(false)
  })

  it('does not handle unrelated keys', () => {
    const result = reduceScoreKey(4, 'a')
    expect(result.handled).toBe(false)
    expect(result.changed).toBe(false)
    expect(result.score).toBe(4)
  })
})

describe('scoreRequiresAdmissionCategory', () => {
  it('requires category for admission scores', () => {
    expect(scoreRequiresAdmissionCategory(3)).toBe(true)
    expect(scoreRequiresAdmissionCategory(4)).toBe(true)
  })

  it('does not require category for other scores', () => {
    expect(scoreRequiresAdmissionCategory(null)).toBe(false)
    expect(scoreRequiresAdmissionCategory(0)).toBe(false)
    expect(scoreRequiresAdmissionCategory(1)).toBe(false)
    expect(scoreRequiresAdmissionCategory(2)).toBe(false)
  })
})

describe('formatEvaluationSummary', () => {
  it('shows a dash when no one has scored', () => {
    expect(formatEvaluationSummary(0, 0)).toBe('—')
  })

  it('renders the sum only', () => {
    expect(formatEvaluationSummary(7, 3)).toBe('7')
  })

  it('shows zero without a sign', () => {
    expect(formatEvaluationSummary(0, 4)).toBe('0')
  })
})

describe('formatScore', () => {
  it('renders scores without a leading plus', () => {
    expect(formatScore(0)).toBe('0')
    expect(formatScore(4)).toBe('4')
  })
})

describe('applyEvaluationPatch', () => {
  const author = {
    enrollmentId: 'enr-1',
    evaluatorId: 'usr-1',
    evaluatorName: 'Ana',
  }

  function entry(overrides: Partial<EvaluationEntry> = {}): EvaluationEntry {
    return {
      enrollmentId: 'enr-1',
      evaluatorId: 'usr-1',
      evaluatorName: 'Ana',
      score: null,
      admissionCategory: null,
      note: null,
      ...overrides,
    }
  }

  it('appends a new entry when the evaluator has none', () => {
    const result = applyEvaluationPatch([], author, { score: 4 })
    expect(result).toEqual([entry({ score: 4 })])
  })

  it('does not mutate the input list', () => {
    const list = [entry({ score: 2 })]
    applyEvaluationPatch(list, author, { score: 3 })
    expect(list[0].score).toBe(2)
  })

  it('updates the matching evaluator entry in place', () => {
    const list = [
      entry({ evaluatorId: 'other', evaluatorName: 'Bo', score: 1 }),
      entry({ score: 2 }),
    ]
    const result = applyEvaluationPatch(list, author, { score: 4 })
    expect(result[0].score).toBe(1)
    expect(result[1].score).toBe(4)
  })

  it('clears the admission category when score drops below admission', () => {
    const list = [entry({ score: 3, admissionCategory: 'new' })]
    const result = applyEvaluationPatch(list, author, { score: 2 })
    expect(result[0].admissionCategory).toBeNull()
  })

  it('keeps the admission category for admission scores', () => {
    const list = [entry({ score: 4, admissionCategory: 'emerging' })]
    const result = applyEvaluationPatch(list, author, { score: 3 })
    expect(result[0].admissionCategory).toBe('emerging')
  })

  it('applies a category-only patch without touching the score', () => {
    const list = [entry({ score: 4 })]
    const result = applyEvaluationPatch(list, author, {
      admissionCategory: 'established',
    })
    expect(result[0]).toMatchObject({
      score: 4,
      admissionCategory: 'established',
    })
  })

  it('applies a note-only patch', () => {
    const list = [entry({ score: 4, admissionCategory: 'new' })]
    const result = applyEvaluationPatch(list, author, { note: 'great' })
    expect(result[0]).toMatchObject({
      score: 4,
      admissionCategory: 'new',
      note: 'great',
    })
  })
})
