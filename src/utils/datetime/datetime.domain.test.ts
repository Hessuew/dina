import { describe, expect, it } from 'vitest'
import {
  parseDatetimeLocalValue,
  toDatetimeLocalValue,
} from './datetime.domain'

describe('toDatetimeLocalValue', () => {
  it('returns empty string for null and undefined', () => {
    expect(toDatetimeLocalValue(null)).toBe('')
    expect(toDatetimeLocalValue(undefined)).toBe('')
  })

  it('returns empty string for unparseable input', () => {
    expect(toDatetimeLocalValue('not-a-date')).toBe('')
  })

  it('zero-pads month, day, hour and minute from a local Date', () => {
    const d = new Date(2026, 0, 5, 9, 7)
    expect(toDatetimeLocalValue(d)).toBe('2026-01-05T09:07')
  })

  it('formats from an ISO string using local wall-clock components', () => {
    const d = new Date(2026, 0, 5, 9, 7)
    expect(toDatetimeLocalValue(d.toISOString())).toBe('2026-01-05T09:07')
  })

  it('uses local wall-clock digits, not UTC ISO slice', () => {
    // Local ctor always yields these components regardless of host TZ.
    const d = new Date(2026, 5, 24, 14, 30)
    const value = toDatetimeLocalValue(d)
    expect(value).toBe('2026-06-24T14:30')
    // When host offset ≠ 0, UTC slice diverges — that is the bug we prevent.
    if (d.getTimezoneOffset() !== 0) {
      expect(value).not.toBe(d.toISOString().slice(0, 16))
    }
  })
})

describe('parseDatetimeLocalValue', () => {
  it('returns null for an empty value', () => {
    expect(parseDatetimeLocalValue('')).toBeNull()
  })

  it('returns null for an unparseable value', () => {
    expect(parseDatetimeLocalValue('not-a-date')).toBeNull()
  })

  it('round-trips with toDatetimeLocalValue to the minute', () => {
    const d = new Date(2026, 5, 24, 14, 30)
    const parsed = parseDatetimeLocalValue(toDatetimeLocalValue(d))
    expect(parsed?.getFullYear()).toBe(2026)
    expect(parsed?.getMonth()).toBe(5)
    expect(parsed?.getDate()).toBe(24)
    expect(parsed?.getHours()).toBe(14)
    expect(parsed?.getMinutes()).toBe(30)
  })
})
