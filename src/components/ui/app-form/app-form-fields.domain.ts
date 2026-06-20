/**
 * Resolve the first form-field validation error into a display string. Errors
 * arrive in many shapes (plain string, `Error`, `{ message }` object, or an
 * arbitrary value), so normalize the first one to a single string or
 * `undefined` when there is nothing to show.
 */
export function getFirstError(errors: Array<unknown>): string | undefined {
  const firstError = errors[0]

  if (!firstError) return undefined
  if (typeof firstError === 'string') return firstError
  if (firstError instanceof Error) return firstError.message
  if (
    typeof firstError === 'object' &&
    'message' in firstError &&
    typeof firstError.message === 'string'
  ) {
    return firstError.message
  }

  return String(firstError)
}
