// Pure glue between stored instants and native <input type="datetime-local">
// values (browser-local wall-clock "YYYY-MM-DDTHH:mm").
// Never use Date#toISOString().slice for form load — that is UTC, not local.

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toDate(input: Date | string): Date | null {
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return null
  return d
}

/** datetime-local input value (local time, minute precision). Empty for null/invalid. */
export function toDatetimeLocalValue(
  input: Date | string | null | undefined,
): string {
  if (input == null) return ''
  const d = toDate(input)
  if (!d) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

/** Parse a datetime-local string as a local Date, or null when empty/invalid. */
export function parseDatetimeLocalValue(value: string): Date | null {
  if (!value) return null
  return toDate(value)
}
