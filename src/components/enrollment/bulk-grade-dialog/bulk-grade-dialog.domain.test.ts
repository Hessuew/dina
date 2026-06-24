import { describe, expect, it } from 'vitest'
import {
  formatPreviewSummary,
  parseFormInputs,
} from './bulk-grade-dialog.domain'

describe('parseFormInputs', () => {
  it('returns valid thresholds for a 2-band input', () => {
    const result = parseFormInputs('6', '')
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.thresholds).toEqual({ approveMin: 6 })
    }
  })

  it('returns valid thresholds for a 3-band input', () => {
    const result = parseFormInputs('7', '3')
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.thresholds).toEqual({ approveMin: 7, waitlistMin: 3 })
    }
  })

  it('fails when approveMin is empty', () => {
    const result = parseFormInputs('', '')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.approveMin).toBeTruthy()
  })

  it('fails when approveMin is not a number', () => {
    const result = parseFormInputs('abc', '')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.approveMin).toBeTruthy()
  })

  it('fails when approveMin exceeds 8', () => {
    const result = parseFormInputs('9', '')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.approveMin).toBeTruthy()
  })

  it('accepts approveMin of 0', () => {
    const result = parseFormInputs('0', '')
    expect(result.valid).toBe(true)
  })

  it('accepts approveMin of 8 (perfect score threshold)', () => {
    const result = parseFormInputs('8', '')
    expect(result.valid).toBe(true)
  })

  it('fails when waitlistMin equals approveMin', () => {
    const result = parseFormInputs('5', '5')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.waitlistMin).toBeTruthy()
  })

  it('fails when waitlistMin is above approveMin', () => {
    const result = parseFormInputs('5', '6')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.waitlistMin).toBeTruthy()
  })

  it('accepts waitlistMin of 0', () => {
    const result = parseFormInputs('6', '0')
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.thresholds.waitlistMin).toBe(0)
  })

  it('fails when waitlistMin is not a number', () => {
    const result = parseFormInputs('6', 'xyz')
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.errors.waitlistMin).toBeTruthy()
  })

  it('treats whitespace-only waitlistMin as empty (2-band)', () => {
    const result = parseFormInputs('6', '   ')
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.thresholds.waitlistMin).toBeUndefined()
  })
})

describe('formatPreviewSummary', () => {
  it('includes all bands when waitlisted > 0', () => {
    const result = formatPreviewSummary({
      approved: 5,
      waitlisted: 3,
      rejected: 2,
      total: 10,
    })
    expect(result).toBe('5 approved · 3 waitlisted · 2 rejected')
  })

  it('omits waitlisted band when 0', () => {
    const result = formatPreviewSummary({
      approved: 7,
      waitlisted: 0,
      rejected: 3,
      total: 10,
    })
    expect(result).toBe('7 approved · 3 rejected')
  })

  it('handles all-zero preview', () => {
    const result = formatPreviewSummary({
      approved: 0,
      waitlisted: 0,
      rejected: 0,
      total: 0,
    })
    expect(result).toBe('0 approved · 0 rejected')
  })
})
