import { describe, expect, it } from 'vitest'
import { isOptionOfQuestion, validateAnswerShape } from './exam-answer.domain'

describe('validateAnswerShape', () => {
  it('accepts a multiple choice answer with an option', () => {
    expect(
      validateAnswerShape('multiple_choice', { selectedOptionId: 'o1' }),
    ).toBeNull()
  })

  it('rejects a multiple choice answer without an option', () => {
    expect(validateAnswerShape('multiple_choice', {})).toBe(
      'Multiple choice answers require a selected option',
    )
  })

  it('rejects a multiple choice answer carrying text', () => {
    expect(
      validateAnswerShape('multiple_choice', {
        selectedOptionId: 'o1',
        textAnswer: 'hi',
      }),
    ).toBe('Multiple choice answers cannot include text')
  })

  it('accepts an open-ended answer with text (including empty)', () => {
    expect(validateAnswerShape('open_ended', { textAnswer: 'my essay' })).toBeNull()
    expect(validateAnswerShape('open_ended', { textAnswer: '' })).toBeNull()
  })

  it('rejects an open-ended answer selecting an option', () => {
    expect(
      validateAnswerShape('open_ended', { selectedOptionId: 'o1' }),
    ).toBe('Open-ended answers cannot select an option')
  })

  it('rejects an open-ended answer without text', () => {
    expect(validateAnswerShape('open_ended', {})).toBe(
      'Open-ended answers require text',
    )
  })
})

describe('isOptionOfQuestion', () => {
  const options = [
    { id: 'o1', questionId: 'q1' },
    { id: 'o2', questionId: 'q2' },
  ]

  it('accepts an option belonging to the question', () => {
    expect(isOptionOfQuestion('o1', 'q1', options)).toBe(true)
  })

  it('rejects an option from another question', () => {
    expect(isOptionOfQuestion('o2', 'q1', options)).toBe(false)
  })

  it('rejects an unknown option', () => {
    expect(isOptionOfQuestion('missing', 'q1', options)).toBe(false)
  })
})
