import { describe, expect, it } from 'vitest'
import {
  awardedPointsLabel,
  gradableOpenAnswer,
  initialAwardedPoints,
  mcOptionSuffix,
  mcOptionTone,
  openAnswerPointsLabel,
  openAnswerText,
} from './grading-rows.domain'

describe('mcOptionTone', () => {
  it('marks the correct option even when also selected', () => {
    expect(mcOptionTone(true, true)).toBe('correct')
    expect(mcOptionTone(true, false)).toBe('correct')
  })

  it('marks a wrong selection and leaves the rest default', () => {
    expect(mcOptionTone(false, true)).toBe('selected')
    expect(mcOptionTone(false, false)).toBe('default')
  })
})

describe('mcOptionSuffix', () => {
  it('appends markers for correct and selected', () => {
    expect(mcOptionSuffix(true, true)).toBe(' ✓ correct · student answer')
    expect(mcOptionSuffix(true, false)).toBe(' ✓ correct')
    expect(mcOptionSuffix(false, true)).toBe(' · student answer')
    expect(mcOptionSuffix(false, false)).toBe('')
  })
})

describe('awardedPointsLabel', () => {
  it('shows awarded points or the placeholder', () => {
    expect(awardedPointsLabel(2, 3, '—')).toBe('2 / 3 pts')
    expect(awardedPointsLabel(null, 3, '—')).toBe('— / 3 pts')
    expect(awardedPointsLabel(undefined, 3, '0')).toBe('0 / 3 pts')
    expect(awardedPointsLabel(0, 1, '—')).toBe('0 / 1 pts')
  })
})

describe('initialAwardedPoints', () => {
  it('defaults to 0 without an answer or grade', () => {
    expect(initialAwardedPoints(undefined)).toBe(0)
    expect(initialAwardedPoints({ awardedPoints: null })).toBe(0)
    expect(initialAwardedPoints({ awardedPoints: 2 })).toBe(2)
  })
})

describe('openAnswerPointsLabel', () => {
  it('uses the placeholder for missing answers or grades', () => {
    expect(openAnswerPointsLabel(undefined, 3)).toBe('— / 3 pts')
    expect(openAnswerPointsLabel({ awardedPoints: null }, 3)).toBe('— / 3 pts')
    expect(openAnswerPointsLabel({ awardedPoints: 1 }, 3)).toBe('1 / 3 pts')
  })
})

describe('openAnswerText', () => {
  it('returns the text only when present and non-empty', () => {
    expect(openAnswerText(undefined)).toBeNull()
    expect(openAnswerText({ textAnswer: null })).toBeNull()
    expect(openAnswerText({ textAnswer: '' })).toBeNull()
    expect(openAnswerText({ textAnswer: 'Hi' })).toBe('Hi')
  })
})

describe('gradableOpenAnswer', () => {
  const answer = { id: 'a1' }
  it('returns the answer only when grading is allowed', () => {
    expect(gradableOpenAnswer(false, answer)).toBe(answer)
    expect(gradableOpenAnswer(true, answer)).toBeNull()
    expect(gradableOpenAnswer(false, undefined)).toBeNull()
  })
})
