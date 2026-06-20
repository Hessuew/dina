import { describe, expect, it } from 'vitest'
import {
  formatNumberFieldValue,
  parseNumberFieldValue,
  resolveFieldFootnote,
} from './form-field/form-field.domain'

describe('parseNumberFieldValue', () => {
  it('treats an empty string as 0', () => {
    expect(parseNumberFieldValue('')).toBe(0)
  })

  it('coerces a numeric string to a number', () => {
    expect(parseNumberFieldValue('42')).toBe(42)
  })
})

describe('formatNumberFieldValue', () => {
  it('renders 0 as an empty string so the field shows the placeholder', () => {
    expect(formatNumberFieldValue(0)).toBe('')
  })

  it('renders a non-zero number as-is', () => {
    expect(formatNumberFieldValue(7)).toBe(7)
  })
})

describe('resolveFieldFootnote', () => {
  it('prefers the error message over the description', () => {
    expect(resolveFieldFootnote('Required', 'Help text')).toEqual({
      text: 'Required',
      className: 'text-destructive text-[0.68rem]',
    })
  })

  it('falls back to the description when there is no error', () => {
    expect(resolveFieldFootnote(undefined, 'Help text')).toEqual({
      text: 'Help text',
      className: 'text-xs text-[#8E816D]',
    })
  })

  it('returns null when neither error nor description is present', () => {
    expect(resolveFieldFootnote(undefined, undefined)).toBeNull()
  })
})
