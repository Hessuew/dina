import { describe, expect, it } from 'vitest'
import {
  INVALID_LINK_FALLBACK,
  NO_TOKEN_ERROR,
  VALIDATION_FAILED_ERROR,
  resolveInvalidLinkMessage,
  resolveResetPasswordViewMode,
  resolveTokenValidationResult,
  validateConfirmPassword,
} from './reset-password-form.domain'

describe('resolveResetPasswordViewMode', () => {
  it('returns loading while validating', () => {
    expect(
      resolveResetPasswordViewMode({
        isValidating: true,
        tokenValid: false,
        tokenError: null,
      }),
    ).toBe('loading')
  })

  it('returns invalid when token is not valid', () => {
    expect(
      resolveResetPasswordViewMode({
        isValidating: false,
        tokenValid: false,
        tokenError: null,
      }),
    ).toBe('invalid')
  })

  it('returns invalid when a token error is present even if valid', () => {
    expect(
      resolveResetPasswordViewMode({
        isValidating: false,
        tokenValid: true,
        tokenError: 'expired',
      }),
    ).toBe('invalid')
  })

  it('returns form when validated and valid with no error', () => {
    expect(
      resolveResetPasswordViewMode({
        isValidating: false,
        tokenValid: true,
        tokenError: null,
      }),
    ).toBe('form')
  })
})

describe('resolveTokenValidationResult', () => {
  it('marks the token valid and clears the error when valid', () => {
    expect(
      resolveTokenValidationResult({ valid: true, message: 'ignored' }),
    ).toEqual({ tokenValid: true, tokenError: null })
  })

  it('marks the token invalid and keeps the message when invalid', () => {
    expect(
      resolveTokenValidationResult({ valid: false, message: 'expired' }),
    ).toEqual({ tokenValid: false, tokenError: 'expired' })
  })
})

describe('resolveInvalidLinkMessage', () => {
  it('returns the token error when present', () => {
    expect(resolveInvalidLinkMessage('expired')).toBe('expired')
  })

  it('falls back to the default message when error is null', () => {
    expect(resolveInvalidLinkMessage(null)).toBe(INVALID_LINK_FALLBACK)
  })

  it('falls back to the default message when error is empty', () => {
    expect(resolveInvalidLinkMessage('')).toBe(INVALID_LINK_FALLBACK)
  })
})

describe('validateConfirmPassword', () => {
  it('requires a confirmation value', () => {
    expect(validateConfirmPassword('', 'secret')).toBe(
      'Please confirm your password',
    )
  })

  it('rejects a mismatch', () => {
    expect(validateConfirmPassword('other', 'secret')).toBe(
      'Passwords do not match',
    )
  })

  it('accepts a matching confirmation', () => {
    expect(validateConfirmPassword('secret', 'secret')).toBeUndefined()
  })
})

describe('error constants', () => {
  it('exposes the no-token error', () => {
    expect(NO_TOKEN_ERROR).toBe('No reset token provided')
  })

  it('exposes the validation-failed error', () => {
    expect(VALIDATION_FAILED_ERROR).toBe('Failed to validate reset token')
  })
})
