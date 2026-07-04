import { describe, expect, it } from 'vitest'
import {
  canEditExam,
  canTransitionAttempt,
  validateForPublish,
} from './exam-lifecycle.domain'
import type { ExamQuestionType } from './exam-lifecycle.domain'

function mc(id: string, prompt = 'Prompt?') {
  return { id, type: 'multiple_choice' as ExamQuestionType, prompt }
}

function open(id: string, prompt = 'Explain.') {
  return { id, type: 'open_ended' as ExamQuestionType, prompt }
}

function options(...corrects: Array<boolean>) {
  return corrects.map((isCorrect) => ({ isCorrect }))
}

describe('canEditExam', () => {
  it('allows editing drafts only', () => {
    expect(canEditExam('draft')).toBe(true)
    expect(canEditExam('published')).toBe(false)
  })
})

describe('validateForPublish', () => {
  it('accepts a valid exam', () => {
    const errors = validateForPublish(
      [mc('q1'), open('q2')],
      new Map([['q1', options(false, true)]]),
    )
    expect(errors).toEqual([])
  })

  it('rejects an exam with no questions', () => {
    expect(validateForPublish([], new Map())).toEqual([
      'Exam must have at least one question',
    ])
  })

  it('rejects an empty prompt', () => {
    const errors = validateForPublish(
      [mc('q1', '  ')],
      new Map([['q1', options(true, false)]]),
    )
    expect(errors).toContain('Question 1: prompt is empty')
  })

  it('rejects multiple choice with fewer than 2 options', () => {
    const errors = validateForPublish([mc('q1')], new Map([['q1', options(true)]]))
    expect(errors).toContain('Question 1: needs at least 2 options')
  })

  it('rejects multiple choice with no options at all', () => {
    const errors = validateForPublish([mc('q1')], new Map())
    expect(errors).toContain('Question 1: needs at least 2 options')
    expect(errors).toContain(
      'Question 1: exactly one option must be marked correct',
    )
  })

  it('rejects zero correct options', () => {
    const errors = validateForPublish(
      [mc('q1')],
      new Map([['q1', options(false, false)]]),
    )
    expect(errors).toContain(
      'Question 1: exactly one option must be marked correct',
    )
  })

  it('rejects two correct options', () => {
    const errors = validateForPublish(
      [mc('q1')],
      new Map([['q1', options(true, true)]]),
    )
    expect(errors).toContain(
      'Question 1: exactly one option must be marked correct',
    )
  })

  it('rejects options on an open-ended question', () => {
    const errors = validateForPublish(
      [open('q1')],
      new Map([['q1', options(true)]]),
    )
    expect(errors).toContain(
      'Question 1: open-ended questions cannot have options',
    )
  })
})

describe('canTransitionAttempt', () => {
  it('allows the forward path only', () => {
    expect(canTransitionAttempt('in_progress', 'submitted')).toBe(true)
    expect(canTransitionAttempt('submitted', 'graded')).toBe(true)
  })

  it('rejects skips and reversals', () => {
    expect(canTransitionAttempt('in_progress', 'graded')).toBe(false)
    expect(canTransitionAttempt('submitted', 'in_progress')).toBe(false)
    expect(canTransitionAttempt('graded', 'submitted')).toBe(false)
    expect(canTransitionAttempt('graded', 'in_progress')).toBe(false)
  })
})
