import { describe, expect, it } from 'vitest'
import { selectedOptionOf, textValueOf } from './question-runner.domain'

describe('selectedOptionOf', () => {
  it('returns the selection or undefined', () => {
    expect(selectedOptionOf(undefined)).toBeUndefined()
    expect(selectedOptionOf({ textAnswer: 'x' })).toBeUndefined()
    expect(selectedOptionOf({ selectedOptionId: 'o1' })).toBe('o1')
  })
})

describe('textValueOf', () => {
  it('returns the text or an empty string', () => {
    expect(textValueOf(undefined)).toBe('')
    expect(textValueOf({ selectedOptionId: 'o1' })).toBe('')
    expect(textValueOf({ textAnswer: 'Hi' })).toBe('Hi')
  })
})
