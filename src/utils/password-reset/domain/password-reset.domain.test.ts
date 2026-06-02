import { describe, expect, it } from 'vitest'
import {
  calculatePasswordResetExpiry,
  checkPasswordResetCooldown,
  checkPasswordResetTokenValid,
  generatePasswordResetToken,
} from './password-reset.domain'

const at = (iso: string) => new Date(iso)

describe('generatePasswordResetToken', () => {
  it('returns a token and tokenHash', () => {
    const { token, tokenHash } = generatePasswordResetToken()
    expect(typeof token).toBe('string')
    expect(typeof tokenHash).toBe('string')
  })

  it('returns 64-char hex token', () => {
    const { token } = generatePasswordResetToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns 64-char hex tokenHash', () => {
    const { tokenHash } = generatePasswordResetToken()
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns unique values on each call', () => {
    const a = generatePasswordResetToken()
    const b = generatePasswordResetToken()
    expect(a.token).not.toBe(b.token)
    expect(a.tokenHash).not.toBe(b.tokenHash)
  })
})

describe('calculatePasswordResetExpiry', () => {
  it('returns a date 10 minutes after now', () => {
    const now = at('2026-01-01T12:00:00Z')
    const expiry = calculatePasswordResetExpiry(now)
    expect(expiry.getTime()).toBe(now.getTime() + 10 * 60 * 1000)
  })

  it('preserves time precision from input', () => {
    const now = at('2026-01-01T12:00:00.500Z')
    const expiry = calculatePasswordResetExpiry(now)
    expect(expiry.getTime()).toBe(now.getTime() + 10 * 60 * 1000)
  })
})

describe('checkPasswordResetCooldown', () => {
  it('returns null when lastRequestAt is null', () => {
    expect(checkPasswordResetCooldown(null, at('2026-01-01T12:00:00Z'))).toBeNull()
  })

  it('returns null when exactly 60 seconds have passed', () => {
    const last = at('2026-01-01T12:00:00Z')
    const now = at('2026-01-01T12:01:00Z')
    expect(checkPasswordResetCooldown(last, now)).toBeNull()
  })

  it('returns null when more than 60 seconds have passed', () => {
    const last = at('2026-01-01T12:00:00Z')
    const now = at('2026-01-01T12:02:00Z')
    expect(checkPasswordResetCooldown(last, now)).toBeNull()
  })

  it('returns wait seconds when within the cooldown window', () => {
    const last = at('2026-01-01T12:00:00Z')
    const now = at('2026-01-01T12:00:45Z')
    expect(checkPasswordResetCooldown(last, now)).toBe(15)
  })

  it('returns 60 when request is at same instant', () => {
    const last = at('2026-01-01T12:00:00Z')
    expect(checkPasswordResetCooldown(last, last)).toBe(60)
  })

  it('rounds up fractional seconds', () => {
    const last = at('2026-01-01T12:00:00.000Z')
    const now = at('2026-01-01T12:00:59.001Z')
    expect(checkPasswordResetCooldown(last, now)).toBe(1)
  })
})

describe('checkPasswordResetTokenValid', () => {
  it('returns valid when not expired and attempts < 5', () => {
    const future = at('2099-01-01T12:00:00Z')
    const now = at('2026-01-01T12:00:00Z')
    const result = checkPasswordResetTokenValid({ expiresAt: future, attempts: 0 }, now)
    expect(result).toEqual({ valid: true, message: 'Token is valid' })
  })

  it('returns invalid when expiresAt is null', () => {
    const result = checkPasswordResetTokenValid({ expiresAt: null, attempts: 0 }, new Date())
    expect(result.valid).toBe(false)
  })

  it('returns invalid when token is expired', () => {
    const past = at('2000-01-01T12:00:00Z')
    const now = at('2026-01-01T12:00:00Z')
    const result = checkPasswordResetTokenValid({ expiresAt: past, attempts: 0 }, now)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('expired')
  })

  it('returns invalid when attempts reach 5', () => {
    const future = at('2099-01-01T12:00:00Z')
    const now = at('2026-01-01T12:00:00Z')
    const result = checkPasswordResetTokenValid({ expiresAt: future, attempts: 5 }, now)
    expect(result.valid).toBe(false)
    expect(result.message).toContain('Too many failed attempts')
  })

  it('returns valid when attempts are exactly 4', () => {
    const future = at('2099-01-01T12:00:00Z')
    const now = at('2026-01-01T12:00:00Z')
    expect(checkPasswordResetTokenValid({ expiresAt: future, attempts: 4 }, now).valid).toBe(true)
  })
})
