import { describe, expect, it } from 'vitest'
import {
  canAuthorEditExam,
  canDeleteExam,
  canEditExam,
  canTransitionAttempt,
  questionStructureErrors,
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
  it('allows editing drafts for non-admins and rejects published exams', () => {
    expect(canEditExam('draft')).toBe(true)
    expect(canEditExam('draft', false)).toBe(true)
    expect(canEditExam('published')).toBe(false)
    expect(canEditExam('published', false)).toBe(false)
  })

  it('allows editing published exams for exam managers', () => {
    expect(canEditExam('draft', true)).toBe(true)
    expect(canEditExam('published', true)).toBe(true)
  })
})

describe('canAuthorEditExam', () => {
  it('allows managers to edit draft or published exams regardless of creator', () => {
    expect(
      canAuthorEditExam('draft', { canManage: true, isCreator: false }),
    ).toBe(true)
    expect(
      canAuthorEditExam('published', { canManage: true, isCreator: false }),
    ).toBe(true)
    expect(
      canAuthorEditExam('published', { canManage: true, isCreator: true }),
    ).toBe(true)
  })

  it('allows creator teacher to edit draft only', () => {
    expect(
      canAuthorEditExam('draft', { canManage: false, isCreator: true }),
    ).toBe(true)
    expect(
      canAuthorEditExam('published', { canManage: false, isCreator: true }),
    ).toBe(false)
  })

  it('rejects non-creator teacher for drafts and published', () => {
    expect(
      canAuthorEditExam('draft', { canManage: false, isCreator: false }),
    ).toBe(false)
    expect(
      canAuthorEditExam('published', { canManage: false, isCreator: false }),
    ).toBe(false)
  })
})

describe('canDeleteExam', () => {
  it('allows deleting drafts only', () => {
    expect(canDeleteExam('draft')).toBe(true)
    expect(canDeleteExam('published')).toBe(false)
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
    const errors = validateForPublish(
      [mc('q1')],
      new Map([['q1', options(true)]]),
    )
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

describe('questionStructureErrors', () => {
  it('accepts a valid multiple-choice question', () => {
    expect(
      questionStructureErrors({
        type: 'multiple_choice',
        options: options(true, false),
      }),
    ).toEqual([])
  })

  it('rejects multiple choice with fewer than 2 options', () => {
    expect(
      questionStructureErrors({
        type: 'multiple_choice',
        options: options(true),
      }),
    ).toEqual(['Multiple choice questions need at least 2 options'])
  })

  it('rejects multiple choice without exactly one correct option', () => {
    expect(
      questionStructureErrors({
        type: 'multiple_choice',
        options: options(false, false),
      }),
    ).toEqual(['Exactly one option must be marked correct'])
    expect(
      questionStructureErrors({
        type: 'multiple_choice',
        options: options(true, true),
      }),
    ).toEqual(['Exactly one option must be marked correct'])
  })

  it('rejects options on an open-ended question', () => {
    expect(
      questionStructureErrors({
        type: 'open_ended',
        options: options(true),
      }),
    ).toEqual(['Open-ended questions cannot have options'])
    expect(
      questionStructureErrors({ type: 'open_ended', options: [] }),
    ).toEqual([])
  })

  it('collapses repeated option ids, counting the last entry once', () => {
    expect(
      questionStructureErrors({
        type: 'multiple_choice',
        options: [
          { id: 'o1', isCorrect: false },
          { id: 'o1', isCorrect: true },
          { isCorrect: false },
        ],
      }),
    ).toEqual([])
    expect(
      questionStructureErrors({
        type: 'multiple_choice',
        options: [
          { id: 'o1', isCorrect: true },
          { id: 'o1', isCorrect: false },
        ],
      }),
    ).toEqual([
      'Multiple choice questions need at least 2 options',
      'Exactly one option must be marked correct',
    ])
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
