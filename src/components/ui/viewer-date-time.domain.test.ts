import { describe, expect, it } from 'vitest'
import { formatViewerDateTime } from './viewer-date-time.domain'
import type { ViewerDateTimePattern } from './viewer-date-time.domain'

describe('formatViewerDateTime', () => {
  const value = new Date(2026, 8, 19, 14, 30)

  it.each([
    ['MMM d', 'Sep 19'],
    ['h:mm a', '2:30 PM'],
    ["MMMM d, yyyy 'at' h:mm a", 'September 19, 2026 at 2:30 PM'],
    ['Pp', '9/19/2026, 2:30 PM'],
    ['PPp', 'Sep 19, 2026, 2:30 PM'],
    ['MMM d, yyyy', 'Sep 19, 2026'],
  ] satisfies Array<[ViewerDateTimePattern, string]>)(
    '%s',
    (pattern, expected) => {
      expect(formatViewerDateTime(value, pattern)).toBe(expected)
    },
  )
})
