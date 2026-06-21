import { describe, expect, it } from 'vitest'
import {
  RESET_ANONYMOUS_MESSAGE,
  buildPasswordResetLink,
  checkResetPasswordInput,
  resolveCooldownMessage,
  resolveValidResetUser,
} from './password-reset-flow.domain'

const at = (iso: string) => new Date(iso)

describe('RESET_ANONYMOUS_MESSAGE', () => {
  it('does not reveal whether an account exists', () => {
    expect(RESET_ANONYMOUS_MESSAGE).toBe(
      'If an account exists with this email, you will receive a password reset link.',
    )
  })
})

describe('resolveCooldownMessage', () => {
  it('is null when there is no prior request', () => {
    expect(resolveCooldownMessage(null, at('2026-01-01T12:00:00Z'))).toBeNull()
  })

  it('treats undefined like no prior request', () => {
    expect(
      resolveCooldownMessage(undefined, at('2026-01-01T12:00:00Z')),
    ).toBeNull()
  })

  it('is null once the cooldown window has elapsed', () => {
    expect(
      resolveCooldownMessage(
        at('2026-01-01T12:00:00Z'),
        at('2026-01-01T12:01:00Z'),
      ),
    ).toBeNull()
  })

  it('returns the wait message within the cooldown window', () => {
    expect(
      resolveCooldownMessage(
        at('2026-01-01T12:00:00Z'),
        at('2026-01-01T12:00:45Z'),
      ),
    ).toBe('Please wait 15 seconds before requesting another reset link.')
  })
})

describe('buildPasswordResetLink', () => {
  it('uses the configured app url', () => {
    expect(buildPasswordResetLink('https://app.example.com', 'abc')).toBe(
      'https://app.example.com/reset-password?token=abc',
    )
  })

  it('falls back to localhost when the url is undefined', () => {
    expect(buildPasswordResetLink(undefined, 'abc')).toBe(
      'http://localhost:3000/reset-password?token=abc',
    )
  })

  it('falls back to localhost when the url is empty', () => {
    expect(buildPasswordResetLink('', 'abc')).toBe(
      'http://localhost:3000/reset-password?token=abc',
    )
  })
})

describe('checkResetPasswordInput', () => {
  it('rejects a missing token', () => {
    expect(checkResetPasswordInput(undefined, 'longenough')).toEqual({
      ok: false,
      message: 'Missing required fields',
    })
  })

  it('rejects a missing password', () => {
    expect(checkResetPasswordInput('token', undefined)).toEqual({
      ok: false,
      message: 'Missing required fields',
    })
  })

  it('rejects a password shorter than 8 characters', () => {
    expect(checkResetPasswordInput('token', 'short')).toEqual({
      ok: false,
      message: 'Password must be at least 8 characters',
    })
  })

  it('accepts valid input and narrows the values', () => {
    expect(checkResetPasswordInput('token', 'longenough')).toEqual({
      ok: true,
      token: 'token',
      newPassword: 'longenough',
    })
  })
})

describe('resolveValidResetUser', () => {
  const future = at('2099-01-01T12:00:00Z')
  const now = at('2026-01-01T12:00:00Z')

  it('rejects when no user matches the token', () => {
    expect(resolveValidResetUser(null, now)).toEqual({
      ok: false,
      message: 'Invalid reset token',
    })
  })

  it('treats undefined as no match', () => {
    expect(resolveValidResetUser(undefined, now)).toEqual({
      ok: false,
      message: 'Invalid reset token',
    })
  })

  it('rejects with the validity message when the token is expired', () => {
    const result = resolveValidResetUser(
      {
        id: 'u1',
        resetTokenExpiresAt: at('2000-01-01T12:00:00Z'),
        resetTokenAttempts: 0,
      },
      now,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('expired')
  })

  it('resolves the user when the token is valid', () => {
    const user = {
      id: 'u1',
      resetTokenExpiresAt: future,
      resetTokenAttempts: 0,
    }
    expect(resolveValidResetUser(user, now)).toEqual({ ok: true, user })
  })
})
