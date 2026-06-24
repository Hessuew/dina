// Pure glue between an ISO anchor and the native <input type="datetime-local">
// value (local wall-clock "YYYY-MM-DDTHH:mm"), kept out of the component shell.

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

export function parseDatetimeLocalValue(value: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d
}
