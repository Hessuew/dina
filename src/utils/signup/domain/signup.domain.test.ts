import { describe, expect, it } from 'vitest'
import {
  calculateOtpExpiry,
  checkOtpResendCooldown,
  generateOTP,
  hashValue,
  validateOtpRecord,
  validateSignupInvitation,
} from './signup.domain'

const at = (iso: string) => new Date(iso)

describe('generateOTP', () => {
  it('returns a 6-character string', () => {
    expect(generateOTP()).toHaveLength(6)
  })

  it('returns a value in range 100000-999999', () => {
    const otp = parseInt(generateOTP(), 10)
    expect(otp).toBeGreaterThanOrEqual(100000)
    expect(otp).toBeLessThanOrEqual(999999)
  })

  it('returns unique values on each call', () => {
    const otps = new Set(Array.from({ length: 20 }, generateOTP))
    expect(otps.size).toBeGreaterThan(1)
  })
})

describe('hashValue', () => {
  it('returns a 64-char hex string', () => {
    expect(hashValue('test')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic for the same input', () => {
    expect(hashValue('abc')).toBe(hashValue('abc'))
  })

  it('produces different hashes for different inputs', () => {
    expect(hashValue('abc')).not.toBe(hashValue('xyz'))
  })
})

describe('calculateOtpExpiry', () => {
  it('returns a date 10 minutes after now', () => {
    const now = at('2026-01-01T12:00:00Z')
    expect(calculateOtpExpiry(now).getTime()).toBe(now.getTime() + 10 * 60 * 1000)
  })
})

describe('checkOtpResendCooldown', () => {
  it('returns null when otpExpiresAt is null', () => {
    expect(checkOtpResendCooldown(null, at('2026-01-01T12:00:00Z'))).toBeNull()
  })

  it('returns null when OTP was sent more than 60 seconds ago', () => {
    // OTP sent at 12:00:00, expires at 12:10:00; checking at 12:01:01 (61s after send)
    const otpExpiresAt = at('2026-01-01T12:10:00Z')
    const now = at('2026-01-01T12:01:01Z')
    expect(checkOtpResendCooldown(otpExpiresAt, now)).toBeNull()
  })

  it('returns null when exactly 60 seconds since last send', () => {
    const otpExpiresAt = at('2026-01-01T12:10:00Z')
    const now = at('2026-01-01T12:01:00Z')
    expect(checkOtpResendCooldown(otpExpiresAt, now)).toBeNull()
  })

  it('returns wait seconds when within cooldown window', () => {
    // OTP sent at 12:00:00, expires at 12:10:00; checking at 12:00:45 (45s after send)
    const otpExpiresAt = at('2026-01-01T12:10:00Z')
    const now = at('2026-01-01T12:00:45Z')
    expect(checkOtpResendCooldown(otpExpiresAt, now)).toBe(15)
  })
})

describe('validateOtpRecord', () => {
  it('returns invalid when otpHash is null', () => {
    const result = validateOtpRecord(
      { otpHash: null, otpExpiresAt: at('2099-01-01T00:00:00Z'), attempts: 0 },
      at('2026-01-01T00:00:00Z'),
    )
    expect(result.valid).toBe(false)
  })

  it('returns invalid when otpExpiresAt is null', () => {
    const result = validateOtpRecord(
      { otpHash: 'abc', otpExpiresAt: null, attempts: 0 },
      at('2026-01-01T00:00:00Z'),
    )
    expect(result.valid).toBe(false)
  })

  it('returns invalid when OTP is expired', () => {
    const result = validateOtpRecord(
      { otpHash: 'abc', otpExpiresAt: at('2000-01-01T00:00:00Z'), attempts: 0 },
      at('2026-01-01T00:00:00Z'),
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain('expired')
  })

  it('returns invalid when attempts reach 5', () => {
    const result = validateOtpRecord(
      { otpHash: 'abc', otpExpiresAt: at('2099-01-01T00:00:00Z'), attempts: 5 },
      at('2026-01-01T00:00:00Z'),
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain('Too many failed attempts')
  })

  it('returns valid when hash exists, not expired, attempts < 5', () => {
    const result = validateOtpRecord(
      { otpHash: 'abc', otpExpiresAt: at('2099-01-01T00:00:00Z'), attempts: 4 },
      at('2026-01-01T00:00:00Z'),
    )
    expect(result.valid).toBe(true)
  })
})

describe('validateSignupInvitation', () => {
  const base = { status: 'pending', expiresAt: at('2099-01-01T00:00:00Z'), email: 'user@test.com' }

  it('returns valid for active pending invitation with matching email', () => {
    const result = validateSignupInvitation(base, 'user@test.com', at('2026-01-01T00:00:00Z'))
    expect(result.valid).toBe(true)
  })

  it('returns invalid when status is accepted', () => {
    const result = validateSignupInvitation(
      { ...base, status: 'accepted' },
      'user@test.com',
      at('2026-01-01T00:00:00Z'),
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain('already been used')
  })

  it('returns invalid when status is revoked', () => {
    const result = validateSignupInvitation(
      { ...base, status: 'revoked' },
      'user@test.com',
      at('2026-01-01T00:00:00Z'),
    )
    expect(result.valid).toBe(false)
  })

  it('returns invalid when invitation is expired', () => {
    const result = validateSignupInvitation(
      { ...base, expiresAt: at('2000-01-01T00:00:00Z') },
      'user@test.com',
      at('2026-01-01T00:00:00Z'),
    )
    expect(result.valid).toBe(false)
    expect(result.message).toContain('expired')
  })

  it('returns invalid when email does not match', () => {
    const result = validateSignupInvitation(base, 'other@test.com', at('2026-01-01T00:00:00Z'))
    expect(result.valid).toBe(false)
    expect(result.message).toContain('Email does not match')
  })
})
