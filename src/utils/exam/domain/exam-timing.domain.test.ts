import { describe, expect, it } from 'vitest'
import {
  SAVE_GRACE_MS,
  computeDeadline,
  formatRemaining,
  isAttemptExpired,
  isSaveAllowed,
  isWithinStartWindow,
  remainingMs,
} from './exam-timing.domain'

const T0 = new Date('2026-07-04T10:00:00.000Z')

function plusMs(ms: number): Date {
  return new Date(T0.getTime() + ms)
}

describe('computeDeadline', () => {
  it('adds durationMinutes to the start time', () => {
    expect(computeDeadline(T0, 30)).toEqual(plusMs(30 * 60_000))
  })

  it('handles a 1-minute duration', () => {
    expect(computeDeadline(T0, 1)).toEqual(plusMs(60_000))
  })
})

describe('isWithinStartWindow', () => {
  const opensAt = T0
  const closesAt = plusMs(60 * 60_000)

  it('allows starting exactly at opensAt', () => {
    expect(isWithinStartWindow(opensAt, opensAt, closesAt)).toBe(true)
  })

  it('allows starting exactly at closesAt', () => {
    expect(isWithinStartWindow(closesAt, opensAt, closesAt)).toBe(true)
  })

  it('rejects starting before opensAt', () => {
    expect(isWithinStartWindow(plusMs(-1), opensAt, closesAt)).toBe(false)
  })

  it('rejects starting after closesAt', () => {
    expect(
      isWithinStartWindow(new Date(closesAt.getTime() + 1), opensAt, closesAt),
    ).toBe(false)
  })
})

describe('isSaveAllowed / isAttemptExpired', () => {
  const deadlineAt = plusMs(30 * 60_000)

  it('allows a save before the deadline', () => {
    expect(isSaveAllowed(plusMs(0), deadlineAt)).toBe(true)
  })

  it('allows a save exactly at deadline + grace', () => {
    const edge = new Date(deadlineAt.getTime() + SAVE_GRACE_MS)
    expect(isSaveAllowed(edge, deadlineAt)).toBe(true)
    expect(isAttemptExpired(edge, deadlineAt)).toBe(false)
  })

  it('rejects a save 1ms past deadline + grace', () => {
    const past = new Date(deadlineAt.getTime() + SAVE_GRACE_MS + 1)
    expect(isSaveAllowed(past, deadlineAt)).toBe(false)
    expect(isAttemptExpired(past, deadlineAt)).toBe(true)
  })

  it('honors a custom grace value', () => {
    const past = new Date(deadlineAt.getTime() + 1)
    expect(isSaveAllowed(past, deadlineAt, 0)).toBe(false)
  })
})

describe('remainingMs', () => {
  const deadlineAt = plusMs(10_000)

  it('returns the time left before the deadline', () => {
    expect(remainingMs(T0, deadlineAt)).toBe(10_000)
  })

  it('clamps to zero after the deadline', () => {
    expect(remainingMs(plusMs(20_000), deadlineAt)).toBe(0)
  })
})

describe('formatRemaining', () => {
  it('formats minutes and padded seconds', () => {
    expect(formatRemaining(29 * 60_000 + 7_000)).toBe('29:07')
  })

  it('formats sub-minute values', () => {
    expect(formatRemaining(9_500)).toBe('0:09')
  })

  it('clamps negative values to 0:00', () => {
    expect(formatRemaining(-5_000)).toBe('0:00')
  })
})
