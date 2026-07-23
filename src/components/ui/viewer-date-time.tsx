import { ClientOnly } from '@tanstack/react-router'
import { format } from 'date-fns'

type ViewerDateTimeProps = {
  value: Date | string | number
  pattern: string
  fallback?: React.ReactNode
}

function ViewerDateTimeValue({
  value,
  pattern,
}: Pick<ViewerDateTimeProps, 'value' | 'pattern'>) {
  const date = new Date(value)
  return <time dateTime={date.toISOString()}>{format(date, pattern)}</time>
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
