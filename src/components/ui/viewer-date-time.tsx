import { ClientOnly } from '@tanstack/react-router'
import { formatViewerDateTime } from './viewer-date-time.domain'
import type { ViewerDateTimePattern } from './viewer-date-time.domain'

type ViewerDateTimeProps = {
  value: Date | string | number
  pattern: ViewerDateTimePattern
  fallback?: React.ReactNode
}

function ViewerDateTimeValue({
  value,
  pattern,
}: Pick<ViewerDateTimeProps, 'value' | 'pattern'>) {
  const date = new Date(value)
  return (
    <time dateTime={date.toISOString()}>
      {formatViewerDateTime(date, pattern)}
    </time>
  )
}

export function ViewerDateTime({
  value,
  pattern,
  fallback = '—',
}: ViewerDateTimeProps) {
  return (
    <ClientOnly fallback={fallback}>
      <ViewerDateTimeValue value={value} pattern={pattern} />
    </ClientOnly>
  )
}
