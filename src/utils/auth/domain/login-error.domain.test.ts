import { describe, expect, it } from 'vitest'
import { getLoginErrorMessage } from './login-error.domain'

describe('getLoginErrorMessage', () => {
  it('maps invalid-credential messages', () => {
    expect(getLoginErrorMessage('Invalid credentials')).toBe(
      'Invalid email or password. Please check your credentials and try again.',
    )
    expect(getLoginErrorMessage('Wrong password')).toBe(
      'Invalid email or password. Please check your credentials and try again.',
    )
    expect(getLoginErrorMessage('That is incorrect')).toBe(
      'Invalid email or password. Please check your credentials and try again.',
    )
  })

  it('maps account-not-found messages', () => {
    expect(getLoginErrorMessage('Email not found')).toBe(
      'No account found with this email. Please sign up first.',
    )
    expect(getLoginErrorMessage('User not found')).toBe(
      'No account found with this email. Please sign up first.',
    )
  })

  it('maps unverified-email messages', () => {
    expect(getLoginErrorMessage('Email not verified')).toBe(
      'Please verify your email before logging in. Check your inbox for the verification link.',
    )
    expect(getLoginErrorMessage('Account is not verified')).toBe(
      'Please verify your email before logging in. Check your inbox for the verification link.',
    )
  })

  it('maps locked-account messages', () => {
    expect(getLoginErrorMessage('Account locked')).toBe(
      'Your account has been locked. Please contact support for assistance.',
    )
    expect(getLoginErrorMessage('This account is locked')).toBe(
      'Your account has been locked. Please contact support for assistance.',
    )
  })

  it('maps network messages', () => {
    expect(getLoginErrorMessage('Network failure')).toBe(
      'Network error. Please check your connection and try again.',
    )
    expect(getLoginErrorMessage('Connection refused')).toBe(
      'Network error. Please check your connection and try again.',
    )
  })

  it('matches case-insensitively', () => {
    expect(getLoginErrorMessage('INVALID CREDENTIALS')).toBe(
      'Invalid email or password. Please check your credentials and try again.',
    )
  })

  it('returns the generic fallback for unrecognized messages', () => {
    expect(getLoginErrorMessage('Some unexpected failure')).toBe(
      'Unable to sign in. Please try again later.',
    )
  })

  it('prefers the first matching pattern by declared order', () => {
    // contains both "not verified" and "locked"; "not verified" is declared first
    expect(getLoginErrorMessage('not verified and locked')).toBe(
      'Please verify your email before logging in. Check your inbox for the verification link.',
    )
  })
})
