import { describe, expect, it } from 'vitest'
import {
  formatEvaluationSummary,
  formatScore,
  reduceScoreKey,
} from './evaluation.domain'

describe('reduceScoreKey', () => {
  it('sets a positive score on a digit press', () => {
    const result = reduceScoreKey(null, '5', false)
    expect(result).toEqual({
      score: 5,
      negativeArmed: false,
      handled: true,
      changed: true,
    })
  })

  it('treats 0 as a valid neutral score', () => {
    const result = reduceScoreKey(null, '0', false)
    expect(result.score).toBe(0)
    expect(result.changed).toBe(true)
  })

  it('arms negative on "-" without changing the score', () => {
    const result = reduceScoreKey(3, '-', false)
    expect(result).toEqual({
      score: 3,
      negativeArmed: true,
      handled: true,
      changed: false,
    })
  })

  it('sets a negative score when armed', () => {
    const result = reduceScoreKey(null, '3', true)
    expect(result.score).toBe(-3)
    expect(result.negativeArmed).toBe(false)
    expect(result.changed).toBe(true)
  })

  it('treats "-" then "0" as 0 (no negative zero)', () => {
    const result = reduceScoreKey(null, '0', true)
    expect(result.score).toBe(0)
  })

  it('clears when re-pressing the active positive value', () => {
    const result = reduceScoreKey(5, '5', false)
    expect(result.score).toBeNull()
    expect(result.changed).toBe(true)
  })

  it('clears when re-pressing the active negative value', () => {
    const result = reduceScoreKey(-3, '3', true)
    expect(result.score).toBeNull()
  })

  it('clears on Backspace when a score is set', () => {
    const result = reduceScoreKey(7, 'Backspace', false)
    expect(result).toEqual({
      score: null,
      negativeArmed: false,
      handled: true,
      changed: true,
    })
  })

  it('reports no change on Backspace when already empty', () => {
    const result = reduceScoreKey(null, 'Backspace', false)
    expect(result.score).toBeNull()
    expect(result.changed).toBe(false)
  })

  it('does not handle unrelated keys', () => {
    const result = reduceScoreKey(4, 'a', false)
    expect(result.handled).toBe(false)
    expect(result.changed).toBe(false)
    expect(result.score).toBe(4)
  })

  it('preserves the armed state for unrelated keys', () => {
    const result = reduceScoreKey(null, 'x', true)
    expect(result.handled).toBe(false)
    expect(result.negativeArmed).toBe(true)
  })
})

describe('formatEvaluationSummary', () => {
  it('shows a dash when no one has scored', () => {
    expect(formatEvaluationSummary(0, 0)).toBe('—')
  })

  it('prefixes positive sums with a plus', () => {
    expect(formatEvaluationSummary(14, 3)).toBe('+14 · 3')
  })

  it('keeps the minus sign for negative sums', () => {
    expect(formatEvaluationSummary(-5, 2)).toBe('-5 · 2')
  })

  it('shows zero without a sign', () => {
    expect(formatEvaluationSummary(0, 4)).toBe('0 · 4')
  })
})

describe('formatScore', () => {
  it('prefixes positive scores with a plus', () => {
    expect(formatScore(5)).toBe('+5')
  })

  it('renders zero and negatives without a leading plus', () => {
    expect(formatScore(0)).toBe('0')
    expect(formatScore(-3)).toBe('-3')
  })
})
