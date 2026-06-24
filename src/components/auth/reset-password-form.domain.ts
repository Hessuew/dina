export const NO_TOKEN_ERROR = 'No reset token provided'
export const VALIDATION_FAILED_ERROR = 'Failed to validate reset token'
export const INVALID_LINK_FALLBACK = 'The reset link is invalid or has expired.'

export type ResetPasswordViewMode = 'loading' | 'invalid' | 'form'

export function resolveResetPasswordViewMode(input: {
  isValidating: boolean
  tokenValid: boolean
  tokenError: string | null
}): ResetPasswordViewMode {
  if (input.isValidating) return 'loading'
  if (!input.tokenValid || input.tokenError) return 'invalid'
  return 'form'
}

export function resolveTokenValidationResult(result: {
  valid: boolean
  message: string
}): { tokenValid: boolean; tokenError: string | null } {
  if (result.valid) return { tokenValid: true, tokenError: null }
  return { tokenValid: false, tokenError: result.message }
}

export function resolveInvalidLinkMessage(tokenError: string | null): string {
  return tokenError || INVALID_LINK_FALLBACK
}

export function validateConfirmPassword(
  value: string,
  password: string,
): string | undefined {
  if (!value) return 'Please confirm your password'
  if (value !== password) return 'Passwords do not match'
  return undefined
}
