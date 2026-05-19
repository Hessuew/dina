import { describe, expect, it } from 'vitest'
import { calculatePasswordStrength } from './password'

describe('calculatePasswordStrength', () => {
  it('returns score 0 and Very Weak for empty string', () => {
    const result = calculatePasswordStrength('')
    expect(result.score).toBe(0)
    expect(result.label).toBe('Very Weak')
  })

  it('returns score 0 for short lowercase-only password', () => {
    const result = calculatePasswordStrength('abc')
    expect(result.score).toBe(0)
    expect(result.label).toBe('Very Weak')
    expect(result.suggestions[0]).toBe('Use at least 8 characters')
  })

  it('returns score 1 and Weak for 8-char lowercase-only password', () => {
    const result = calculatePasswordStrength('password')
    expect(result.score).toBe(1)
    expect(result.label).toBe('Weak')
  })

  it('returns score 2 and Fair for 8-char mixed-case password', () => {
    const result = calculatePasswordStrength('Password')
    expect(result.score).toBe(2)
    expect(result.label).toBe('Fair')
  })

  it('returns score 3 and Good when adding a number', () => {
    const result = calculatePasswordStrength('Password1')
    expect(result.score).toBe(3)
    expect(result.label).toBe('Good')
  })

  it('returns score 4 and Strong when adding a special character', () => {
    const result = calculatePasswordStrength('Password1!')
    expect(result.score).toBe(4)
    expect(result.label).toBe('Strong')
  })

  it('returns score 5 and Strong for 12+ chars with all character types', () => {
    const result = calculatePasswordStrength('LongPassword1!')
    expect(result.score).toBe(5)
    expect(result.label).toBe('Strong')
  })

  it('shows at most 2 suggestions even when multiple rules fail', () => {
    const result = calculatePasswordStrength('abc')
    expect(result.suggestions).toHaveLength(2)
  })
})
