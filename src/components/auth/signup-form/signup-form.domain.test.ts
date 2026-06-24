import { describe, expect, it } from 'vitest'
import {
  buildEmailFieldView,
  getUserFriendlyError,
  isOtpComplete,
  isResendDisabled,
  isSignupSubmitDisabled,
  resolveResendLabel,
  resolveResendOutcome,
  resolveSignupOutcome,
  resolveVerifyOutcome,
} from './signup-form.domain'

const baseEmailState = {
  isCheckingEmail: false,
  isLoadingToken: false,
  invitationError: null,
  invitationValid: false,
  invitationRole: null,
}

describe('getUserFriendlyError', () => {
  it('maps a known needle to its friendly message', () => {
    expect(getUserFriendlyError('Email already exists')).toBe(
      'An account with this email already exists. Please try logging in instead.',
    )
  })

  it('matches case-insensitively on any needle in a pattern', () => {
    expect(getUserFriendlyError('INVALID EMAIL format')).toBe(
      'Please enter a valid email address.',
    )
  })

  it('falls back to a generic message when nothing matches', () => {
    expect(getUserFriendlyError('totally unexpected')).toBe(
      'Something went wrong. Please try again later.',
    )
  })
})

describe('resolveSignupOutcome', () => {
  it('returns a friendly error outcome when the result is an error', () => {
    expect(
      resolveSignupOutcome({ error: true, message: 'rate limit reached' }),
    ).toEqual({
      kind: 'error',
      message: 'Too many attempts. Please wait a moment and try again.',
    })
  })

  it('returns otp-required with the raw description when otp is required', () => {
    expect(
      resolveSignupOutcome({
        error: false,
        requiresOtp: true,
        message: 'Check your inbox',
      }),
    ).toEqual({ kind: 'otp-required', description: 'Check your inbox' })
  })

  it('returns none when there is no error and otp is not required', () => {
    expect(resolveSignupOutcome({ error: false, message: 'ok' })).toEqual({
      kind: 'none',
    })
  })
})

describe('resolveVerifyOutcome', () => {
  it('returns verified-login when success but login failed', () => {
    expect(
      resolveVerifyOutcome({ success: true, loginFailed: true, message: '' }),
    ).toEqual({ kind: 'verified-login' })
  })

  it('returns verified-dashboard when success and login did not fail', () => {
    expect(resolveVerifyOutcome({ success: true, message: '' })).toEqual({
      kind: 'verified-dashboard',
    })
  })

  it('returns a friendly error outcome when not successful', () => {
    expect(
      resolveVerifyOutcome({ success: false, message: 'invalid code' }),
    ).toEqual({
      kind: 'error',
      message:
        'The verification code you entered is incorrect. Please try again.',
    })
  })
})

describe('resolveResendOutcome', () => {
  it('returns sent with the raw message when successful', () => {
    expect(
      resolveResendOutcome({ success: true, message: 'Code resent' }),
    ).toEqual({ kind: 'sent', message: 'Code resent' })
  })

  it('returns a friendly error outcome when not successful', () => {
    expect(
      resolveResendOutcome({ success: false, message: 'network down' }),
    ).toEqual({
      kind: 'error',
      message: 'Network error. Please check your connection and try again.',
    })
  })
})

describe('isOtpComplete', () => {
  it('is true for a six-character code', () => {
    expect(isOtpComplete('123456')).toBe(true)
  })

  it('is false for a shorter code', () => {
    expect(isOtpComplete('123')).toBe(false)
  })
})

describe('resolveResendLabel', () => {
  it('shows the remaining cooldown while counting down', () => {
    expect(resolveResendLabel(42, false)).toBe('Resend (42s)')
  })

  it('shows a sending label when resending and no cooldown', () => {
    expect(resolveResendLabel(0, true)).toBe('Sending...')
  })

  it('shows the idle resend label otherwise', () => {
    expect(resolveResendLabel(0, false)).toBe('Resend Code')
  })
})

describe('isResendDisabled', () => {
  it('is disabled during the cooldown', () => {
    expect(isResendDisabled(5, false)).toBe(true)
  })

  it('is disabled while a resend is in flight', () => {
    expect(isResendDisabled(0, true)).toBe(true)
  })

  it('is enabled when idle and off cooldown', () => {
    expect(isResendDisabled(0, false)).toBe(false)
  })
})

describe('isSignupSubmitDisabled', () => {
  it('is disabled while the signup request is pending', () => {
    expect(isSignupSubmitDisabled(true, true, undefined)).toBe(true)
  })

  it('is disabled when the invitation is not valid', () => {
    expect(isSignupSubmitDisabled(false, false, undefined)).toBe(true)
  })

  it('is disabled after a successful (non-error) result to prevent resubmit', () => {
    expect(
      isSignupSubmitDisabled(false, true, { error: false, message: 'ok' }),
    ).toBe(true)
  })

  it('is enabled when valid, idle, and the last result was an error', () => {
    expect(
      isSignupSubmitDisabled(false, true, { error: true, message: 'nope' }),
    ).toBe(false)
  })

  it('is enabled when valid, idle, and there is no prior result', () => {
    expect(isSignupSubmitDisabled(false, true, undefined)).toBe(false)
  })
})

describe('buildEmailFieldView', () => {
  it('hides the spinner and shows no descriptions in the idle state', () => {
    expect(buildEmailFieldView(baseEmailState)).toEqual({
      spinnerVisible: false,
      inputDisabled: false,
      descriptions: [],
    })
  })

  it('shows the spinner and a checking description while checking email', () => {
    const view = buildEmailFieldView({
      ...baseEmailState,
      isCheckingEmail: true,
    })
    expect(view.spinnerVisible).toBe(true)
    expect(view.descriptions).toEqual([
      { key: 'checking', text: 'Checking email...', variant: 'muted' },
    ])
  })

  it('shows the spinner, disables input, and a loading description while loading a token', () => {
    const view = buildEmailFieldView({
      ...baseEmailState,
      isLoadingToken: true,
    })
    expect(view).toEqual({
      spinnerVisible: true,
      inputDisabled: true,
      descriptions: [
        { key: 'loading', text: 'Loading invitation...', variant: 'muted' },
      ],
    })
  })

  it('surfaces an invitation error as a destructive description', () => {
    const view = buildEmailFieldView({
      ...baseEmailState,
      invitationError: 'Not invited',
    })
    expect(view.descriptions).toEqual([
      { key: 'error', text: 'Not invited', variant: 'error' },
    ])
  })

  it('shows the invited role and disables input once the invitation is valid', () => {
    const view = buildEmailFieldView({
      ...baseEmailState,
      invitationValid: true,
      invitationRole: 'student',
    })
    expect(view.inputDisabled).toBe(true)
    expect(view.descriptions).toEqual([
      { key: 'invited', text: '✓ Invited as student', variant: 'success' },
    ])
  })

  it('omits the invited description when valid but role is missing', () => {
    const view = buildEmailFieldView({
      ...baseEmailState,
      invitationValid: true,
      invitationRole: null,
    })
    expect(view.descriptions).toEqual([])
  })
})
