const USER_FRIENDLY_ERROR_PATTERNS: Array<{
  needles: Array<string>
  message: string
}> = [
  {
    needles: ['email already exists', 'duplicate'],
    message:
      'An account with this email already exists. Please try logging in instead.',
  },
  {
    needles: ['invalid email', 'email format'],
    message: 'Please enter a valid email address.',
  },
  {
    needles: ['password too short', 'password too weak'],
    message: 'Your password is too weak. Please use a stronger password.',
  },
  {
    needles: ['invitation', 'invited'],
    message:
      'You need a valid invitation to sign up. Please check your invitation link.',
  },
  {
    needles: ['otp', 'verification code', 'code'],
    message:
      'The verification code you entered is incorrect. Please try again.',
  },
  {
    needles: ['expired', 'timeout'],
    message: 'The verification code has expired. Please request a new one.',
  },
  {
    needles: ['rate limit', 'too many'],
    message: 'Too many attempts. Please wait a moment and try again.',
  },
  {
    needles: ['network', 'connection'],
    message: 'Network error. Please check your connection and try again.',
  },
]

export function getUserFriendlyError(message: string): string {
  const lowerMessage = message.toLowerCase()
  const match = USER_FRIENDLY_ERROR_PATTERNS.find(({ needles }) =>
    needles.some((needle) => lowerMessage.includes(needle)),
  )

  return match?.message ?? 'Something went wrong. Please try again later.'
}

export interface SignupResult {
  error: boolean
  requiresOtp?: boolean
  email?: string
  message: string
}

export type SignupOutcome =
  | { kind: 'error'; message: string }
  | { kind: 'otp-required'; description: string }
  | { kind: 'none' }

export function resolveSignupOutcome(result: SignupResult): SignupOutcome {
  if (result.error) {
    return { kind: 'error', message: getUserFriendlyError(result.message) }
  }
  if (result.requiresOtp) {
    return { kind: 'otp-required', description: result.message }
  }
  return { kind: 'none' }
}

export interface VerifyOtpResult {
  success: boolean
  loginFailed?: boolean
  message: string
}

export type VerifyOutcome =
  | { kind: 'verified-login' }
  | { kind: 'verified-dashboard' }
  | { kind: 'error'; message: string }

export function resolveVerifyOutcome(result: VerifyOtpResult): VerifyOutcome {
  if (result.success) {
    return result.loginFailed
      ? { kind: 'verified-login' }
      : { kind: 'verified-dashboard' }
  }
  return { kind: 'error', message: getUserFriendlyError(result.message) }
}

export interface ResendOtpResult {
  success: boolean
  message: string
}

export type ResendOutcome =
  | { kind: 'sent'; message: string }
  | { kind: 'error'; message: string }

export function resolveResendOutcome(result: ResendOtpResult): ResendOutcome {
  return result.success
    ? { kind: 'sent', message: result.message }
    : { kind: 'error', message: getUserFriendlyError(result.message) }
}

export function isOtpComplete(value: string): boolean {
  return value.length === 6
}

export function resolveResendLabel(
  cooldown: number,
  isResending: boolean,
): string {
  if (cooldown > 0) {
    return `Resend (${cooldown}s)`
  }
  return isResending ? 'Sending...' : 'Resend Code'
}

export function isResendDisabled(
  cooldown: number,
  isResending: boolean,
): boolean {
  return cooldown > 0 || isResending
}

export function isSignupSubmitDisabled(
  isPending: boolean,
  invitationValid: boolean,
  data: SignupResult | undefined,
): boolean {
  return isPending || !invitationValid || (data !== undefined && !data.error)
}

export interface EmailFieldState {
  isCheckingEmail: boolean
  isLoadingToken: boolean
  invitationError: string | null
  invitationValid: boolean
  invitationRole: string | null
}

export interface EmailDescriptionItem {
  key: string
  text: string
  variant: 'muted' | 'error' | 'success'
}

export interface EmailFieldView {
  spinnerVisible: boolean
  inputDisabled: boolean
  descriptions: Array<EmailDescriptionItem>
}

function buildEmailDescriptions(
  state: EmailFieldState,
): Array<EmailDescriptionItem> {
  const items: Array<EmailDescriptionItem> = []
  if (state.isCheckingEmail) {
    items.push({ key: 'checking', text: 'Checking email...', variant: 'muted' })
  }
  if (state.isLoadingToken) {
    items.push({
      key: 'loading',
      text: 'Loading invitation...',
      variant: 'muted',
    })
  }
  if (state.invitationError) {
    items.push({ key: 'error', text: state.invitationError, variant: 'error' })
  }
  if (state.invitationValid && state.invitationRole) {
    items.push({
      key: 'invited',
      text: `✓ Invited as ${state.invitationRole}`,
      variant: 'success',
    })
  }
  return items
}

export function buildEmailFieldView(state: EmailFieldState): EmailFieldView {
  return {
    spinnerVisible: state.isCheckingEmail || state.isLoadingToken,
    inputDisabled: state.invitationValid || state.isLoadingToken,
    descriptions: buildEmailDescriptions(state),
  }
}
