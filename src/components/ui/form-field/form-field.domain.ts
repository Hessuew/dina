/**
 * Coerce a number-input's raw string value into the numeric model value. An
 * empty field reads as `0` so the controlled `onChange` always emits a number.
 */
export function parseNumberFieldValue(raw: string): number {
  return raw === '' ? 0 : Number(raw)
}

/**
 * Render the numeric model value for display: `0` shows as an empty string so
 * the input falls back to its placeholder instead of a literal zero.
 */
export function formatNumberFieldValue(value: number): number | string {
  return value === 0 ? '' : value
}

export interface FieldFootnote {
  text: string
  className: string
}

/**
 * Derive the single footnote a form field shows beneath its input: the error
 * message takes precedence, otherwise the description, otherwise nothing.
 */
export function resolveFieldFootnote(
  error?: string,
  description?: string,
): FieldFootnote | null {
  if (error) return { text: error, className: 'text-destructive text-[0.68rem]' }
  if (description) return { text: description, className: 'text-xs text-[#8E816D]' }
  return null
}
