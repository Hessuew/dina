import { describe, expect, it } from 'vitest'
import {
  calculateTokenExpiry,
  checkEmailChangeRateLimit,
  generateEmailChangeToken,
  validateEmailChangeToken,
} from './profile.domain'

const at = (isoString: string) => new Date(isoString)

describe('checkEmailChangeRateLimit', () => {
  it('returns null when lastRequestAt is null', () => {
    expect(
      checkEmailChangeRateLimit(null, at('2026-01-01T12:01:00Z')),
    ).toBeNull()
  })

  it('returns null when 60 seconds have passed', () => {
    const last = at('2026-01-01T12:00:00Z')
    const now = at('2026-01-01T12:01:00Z')
    expect(checkEmailChangeRateLimit(last, now)).toBeNull()
  })

  it('returns null when more than 60 seconds have passed', () => {
    const last = at('2026-01-01T12:00:00Z')
    const now = at('2026-01-01T12:02:00Z')
    expect(checkEmailChangeRateLimit(last, now)).toBeNull()
  })

  it('returns wait seconds when within the 60-second window', () => {
    const last = at('2026-01-01T12:00:00Z')
    const now = at('2026-01-01T12:00:45Z') // 45 seconds later
    expect(checkEmailChangeRateLimit(last, now)).toBe(15)
  })

  it('returns 60 when the request is at the same instant', () => {
    const last = at('2026-01-01T12:00:00Z')
    const now = at('2026-01-01T12:00:00Z')
    expect(checkEmailChangeRateLimit(last, now)).toBe(60)
  })

  it('rounds up fractional seconds', () => {
    const last = at('2026-01-01T12:00:00.000Z')
    const now = at('2026-01-01T12:00:00.500Z') // 500ms later
    expect(checkEmailChangeRateLimit(last, now)).toBe(60)
  })

  it('returns 1 when just under 1 second remains', () => {
    const last = at('2026-01-01T12:00:00Z')
    const now = at('2026-01-01T12:00:59.001Z') // 59.001s later → 0.999s remaining
    expect(checkEmailChangeRateLimit(last, now)).toBe(1)
  })
})

describe('generateEmailChangeToken', () => {
  it('returns a token and tokenHash', () => {
    const { token, tokenHash } = generateEmailChangeToken()
    expect(typeof token).toBe('string')
    expect(typeof tokenHash).toBe('string')
  })

  it('returns a 64-character hex token', () => {
    const { token } = generateEmailChangeToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns a 64-character hex tokenHash', () => {
    const { tokenHash } = generateEmailChangeToken()
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns unique tokens on each call', () => {
    const first = generateEmailChangeToken()
    const second = generateEmailChangeToken()
    expect(first.token).not.toBe(second.token)
    expect(first.tokenHash).not.toBe(second.tokenHash)
  })
})

describe('calculateTokenExpiry', () => {
  it('returns a date approximately 24 hours in the future', () => {
    const before = Date.now()
    const expiry = calculateTokenExpiry()
    const after = Date.now()
    const expectedMs = 24 * 60 * 60 * 1000
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + expectedMs)
    expect(expiry.getTime()).toBeLessThanOrEqual(after + expectedMs)
  })
})

describe('validateEmailChangeToken', () => {
  const base = {
    emailChangeTokenExpiresAt: new Date('2099-01-01T00:00:00Z'),
    emailChangeTokenAttempts: 0,
    pendingEmail: 'new@test.com',
  }
  const now = new Date('2026-01-01T00:00:00Z')

  it('returns valid when token is active and pendingEmail exists', () => {
    expect(validateEmailChangeToken(base, now).valid).toBe(true)
  })

  it('returns invalid when emailChangeTokenExpiresAt is null', () => {
    expect(
      validateEmailChangeToken(
        { ...base, emailChangeTokenExpiresAt: null },
        now,
      ).valid,
    ).toBe(false)
  })

  it('returns invalid when token is expired', () => {
    const result = validateEmailChangeToken(
      { ...base, emailChangeTokenExpiresAt: new Date('2000-01-01T00:00:00Z') },
      now,
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain('expired')
  })

  it('returns invalid when attempts reach 5', () => {
    const result = validateEmailChangeToken(
      { ...base, emailChangeTokenAttempts: 5 },
      now,
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain('Too many failed attempts')
  })

  it('returns invalid when pendingEmail is null', () => {
    expect(
      validateEmailChangeToken({ ...base, pendingEmail: null }, now).valid,
    ).toBe(false)
  })
})
