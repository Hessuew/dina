export interface PasswordStrength {
  score: number // 0-4
  label: string
  color: string
  suggestions: Array<string>
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0
  const suggestions: Array<string> = []

  // Length check
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  else if (password.length < 8) {
    suggestions.push('Use at least 8 characters')
  }

  // Character variety checks
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)

  if (hasLowercase && hasUppercase) score++
  else suggestions.push('Mix uppercase and lowercase letters')

  if (hasNumber) score++
  else suggestions.push('Include at least one number')

  if (hasSpecial) score++
  else suggestions.push('Add a special character (!@#$%^&*)')

  // Determine label and color based on score
  let label: string
  let color: string

  if (score === 0) {
    label = 'Very Weak'
    color = 'bg-red-500'
  } else if (score === 1) {
    label = 'Weak'
    color = 'bg-orange-500'
  } else if (score === 2) {
    label = 'Fair'
    color = 'bg-yellow-500'
  } else if (score === 3) {
    label = 'Good'
    color = 'bg-blue-500'
  } else {
    label = 'Strong'
    color = 'bg-green-500'
  }

  return {
    score,
    label,
    color,
    suggestions: suggestions.slice(0, 2), // Show max 2 suggestions
  }
}
