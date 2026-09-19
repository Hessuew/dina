export type ViewerDateTimePattern =
  'MMM d' | 'h:mm a' | "MMMM d, yyyy 'at' h:mm a" | 'Pp' | 'PPp' | 'MMM d, yyyy'

const VIEWER_DATE_TIME_OPTIONS: Record<
  ViewerDateTimePattern,
  Intl.DateTimeFormatOptions
> = {
  'MMM d': { month: 'short', day: 'numeric' },
  'h:mm a': { hour: 'numeric', minute: '2-digit', hour12: true },
  "MMMM d, yyyy 'at' h:mm a": {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  },
  Pp: {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  },
  PPp: {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  },
  'MMM d, yyyy': { month: 'short', day: 'numeric', year: 'numeric' },
}

export function formatViewerDateTime(
  value: Date | string | number,
  pattern: ViewerDateTimePattern,
): string {
  return new Intl.DateTimeFormat(
    'en-US',
    VIEWER_DATE_TIME_OPTIONS[pattern],
  ).format(new Date(value))
}
