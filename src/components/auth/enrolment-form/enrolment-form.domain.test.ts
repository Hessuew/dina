import { describe, expect, it } from 'vitest'
import {
  resolveEnrolmentKeyNavigation,
  validateEnrolmentYear,
} from './enrolment-form.domain'

describe('resolveEnrolmentKeyNavigation', () => {
  it('returns none when target is a textarea', () => {
    expect(resolveEnrolmentKeyNavigation('Enter', false, true, 1)).toBe('none')
  })

  it('returns next-prevent-default for Enter without shift', () => {
    expect(resolveEnrolmentKeyNavigation('Enter', false, false, 0)).toBe(
      'next-prevent-default',
    )
  })

  it('returns none for Enter with shift key', () => {
    expect(resolveEnrolmentKeyNavigation('Enter', true, false, 0)).toBe('none')
  })

  it('returns next for ArrowRight', () => {
    expect(resolveEnrolmentKeyNavigation('ArrowRight', false, false, 0)).toBe(
      'next',
    )
  })

  it('returns back for ArrowLeft when not on first step', () => {
    expect(resolveEnrolmentKeyNavigation('ArrowLeft', false, false, 1)).toBe(
      'back',
    )
  })

  it('returns none for ArrowLeft on the first step', () => {
    expect(resolveEnrolmentKeyNavigation('ArrowLeft', false, false, 0)).toBe(
      'none',
    )
  })

  it('returns none for unrelated keys', () => {
    expect(resolveEnrolmentKeyNavigation('Escape', false, false, 2)).toBe(
      'none',
    )
  })
})

describe('validateEnrolmentYear', () => {
  it('returns error for empty string', () => {
    expect(validateEnrolmentYear('')).toBe('Year of birth is required')
  })

  it('returns error for zero', () => {
    expect(validateEnrolmentYear('0')).toBe('Year of birth is required')
  })

  it('returns error for decimal year', () => {
    expect(validateEnrolmentYear('1990.5', 2025)).toBe(
      'Year of birth must be a whole number',
    )
  })

  it('returns error for year before 1900', () => {
    expect(validateEnrolmentYear('1899', 2025)).toBe(
      'Year of birth must be reasonable',
    )
  })

  it('returns error for year in the future', () => {
    expect(validateEnrolmentYear('2026', 2025)).toBe(
      'Year of birth cannot be in the future',
    )
  })

  it('returns undefined for a valid year', () => {
    expect(validateEnrolmentYear('1990', 2025)).toBeUndefined()
  })

  it('accepts numeric input', () => {
    expect(validateEnrolmentYear(1990, 2025)).toBeUndefined()
  })
})
