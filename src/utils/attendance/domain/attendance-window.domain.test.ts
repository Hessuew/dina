import { describe, expect, it } from 'vitest'
import {
  ATTENDANCE_WINDOW_MINUTES,
  computeClosesAt,
  formatRemaining,
  isAttendanceWindowOpen,
  remainingMs,
} from './attendance-window.domain'

const T0 = new Date('2026-07-15T10:00:00.000Z')

function plusMs(ms: number): Date {
  return new Date(T0.getTime() + ms)
}

describe('computeClosesAt', () => {
  it('defaults to 10 minutes after open', () => {
    expect(computeClosesAt(T0)).toEqual(
      plusMs(ATTENDANCE_WINDOW_MINUTES * 60_000),
    )
  })

  it('respects an explicit duration', () => {
    expect(computeClosesAt(T0, 5)).toEqual(plusMs(5 * 60_000))
  })
})

describe('isAttendanceWindowOpen', () => {
  it('is closed when closesAt is null', () => {
    expect(isAttendanceWindowOpen(T0, null)).toBe(false)
  })

  it('is open before closesAt', () => {
    expect(isAttendanceWindowOpen(T0, plusMs(10 * 60_000))).toBe(true)
  })

  it('is closed exactly at closesAt', () => {
    const closesAt = plusMs(10 * 60_000)
    expect(isAttendanceWindowOpen(closesAt, closesAt)).toBe(false)
  })

  it('is closed after closesAt', () => {
    expect(
      isAttendanceWindowOpen(plusMs(10 * 60_000 + 1), plusMs(10 * 60_000)),
    ).toBe(false)
  })
})

describe('remainingMs / formatRemaining', () => {
  it('clamps remaining to zero', () => {
    expect(remainingMs(plusMs(100), T0)).toBe(0)
  })

  it('formats as m:ss', () => {
    expect(formatRemaining(9 * 60_000 + 7_000)).toBe('9:07')
    expect(formatRemaining(9_000)).toBe('0:09')
    expect(formatRemaining(0)).toBe('0:00')
  })
})
