export type EnrolmentKeyNavigation =
  | 'next'
  | 'next-prevent-default'
  | 'back'
  | 'none'

export function resolveEnrolmentKeyNavigation(
  key: string,
  shiftKey: boolean,
  isTextareaTarget: boolean,
  currentStep: number,
): EnrolmentKeyNavigation {
  if (isTextareaTarget) return 'none'
  if (key === 'Enter' && !shiftKey) return 'next-prevent-default'
  if (key === 'ArrowRight') return 'next'
  if (key === 'ArrowLeft' && currentStep > 0) return 'back'
  return 'none'
}

export function validateEnrolmentYear(
  value: string | number,
  currentYear = new Date().getFullYear(),
): string | undefined {
  const trimmed = String(value).trim()
  if (!trimmed || trimmed === '0') return 'Year of birth is required'
  const year = Number(trimmed)
  if (!Number.isInteger(year)) return 'Year of birth must be a whole number'
  if (year < 1900) return 'Year of birth must be reasonable'
  if (year > currentYear) return 'Year of birth cannot be in the future'
  return undefined
}
