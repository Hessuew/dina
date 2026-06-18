const LOGIN_ERROR_PATTERNS: Array<{
  needles: Array<string>
  message: string
}> = [
  {
    needles: ['invalid credentials', 'wrong password', 'incorrect'],
    message:
      'Invalid email or password. Please check your credentials and try again.',
  },
  {
    needles: ['email not found', 'user not found'],
    message: 'No account found with this email. Please sign up first.',
  },
  {
    needles: ['email not verified', 'not verified'],
    message:
      'Please verify your email before logging in. Check your inbox for the verification link.',
  },
  {
    needles: ['account locked', 'locked'],
    message:
      'Your account has been locked. Please contact support for assistance.',
  },
  {
    needles: ['network', 'connection'],
    message: 'Network error. Please check your connection and try again.',
  },
]

export function getLoginErrorMessage(message: string): string {
  const lowerMessage = message.toLowerCase()
  const match = LOGIN_ERROR_PATTERNS.find(({ needles }) =>
    needles.some((needle) => lowerMessage.includes(needle)),
  )

  return match?.message ?? 'Unable to sign in. Please try again later.'
}
