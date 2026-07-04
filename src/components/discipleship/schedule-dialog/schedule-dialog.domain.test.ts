import { describe, expect, it } from 'vitest'
import {
  parseDatetimeLocalValue,
  toDatetimeLocalValue,
} from './schedule-dialog.domain'

describe('toDatetimeLocalValue', () => {
  it('returns an empty string for a null anchor', () => {
    expect(toDatetimeLocalValue(null)).toBe('')
  })

  it('zero-pads month, day, hour and minute', () => {
    const d = new Date(2026, 0, 5, 9, 7)
    expect(toDatetimeLocalValue(d.toISOString())).toBe('2026-01-05T09:07')
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
    const parsed = parseDatetimeLocalValue(toDatetimeLocalValue(d.toISOString()))
    expect(parsed?.getTime()).toBe(d.getTime())
  })
})
