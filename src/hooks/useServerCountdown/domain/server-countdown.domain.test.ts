import { describe, expect, it } from 'vitest'
import {
  computeClockSkew,
  remainingWithSkew,
} from './server-countdown.domain'

describe('computeClockSkew', () => {
  it('is positive when server is ahead', () => {
    expect(computeClockSkew(1_000, 900)).toBe(100)
  })

  it('is negative when client is ahead', () => {
    expect(computeClockSkew(1_000, 1_200)).toBe(-200)
  })

  it('is zero when clocks match', () => {
    expect(computeClockSkew(5_000, 5_000)).toBe(0)
  })
})

describe('remainingWithSkew', () => {
  it('returns full remaining with zero skew', () => {
    expect(remainingWithSkew(1_000, 0, 11_000)).toBe(10_000)
  })

  it('applies positive skew (server ahead → less remaining)', () => {
    expect(remainingWithSkew(1_000, 500, 11_000)).toBe(9_500)
  })

  it('applies negative skew (client ahead → more remaining)', () => {
    expect(remainingWithSkew(1_000, -500, 11_000)).toBe(10_500)
  })

  it('floors at zero past deadline', () => {
    expect(remainingWithSkew(12_000, 0, 11_000)).toBe(0)
  })
})
