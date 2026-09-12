export type LogLevel = 'info' | 'warn' | 'error'

export type StructuredLogFields = Record<string, unknown>

const REDACTED = '[REDACTED]'
const SENSITIVE_KEY =
  /access.?key|api.?key|authorization|cookie|credential|connectionString|dsn|password|private.?key|secret|service.?role|token|message|stack|body|content|email|phone/iu

export function logServerEvent(
  level: LogLevel,
  event: string,
  fields: StructuredLogFields = {},
): void {
  const entry = {
    ...redactLogFields(fields),
    level,
    event,
  }
  const line = JSON.stringify(entry)

  if (level === 'error') {
    console.error(line)
    return
  }

  if (level === 'warn') {
    console.warn(line)
    return
  }

  console.info(line)
}

function redactLogFields(fields: StructuredLogFields): StructuredLogFields {
  return redactLogValue(fields) as StructuredLogFields
}

function redactLogValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEY.test(key)) return REDACTED
  if (value instanceof Error) return { name: value.name }
  if (Array.isArray(value)) return value.map((item) => redactLogValue(item))
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([field, fieldValue]) => [
        field,
        redactLogValue(fieldValue, field),
      ]),
    )
  }
  if (typeof value === 'bigint') return value.toString()
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
