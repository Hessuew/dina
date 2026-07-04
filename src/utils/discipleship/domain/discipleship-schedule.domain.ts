// Discipleship meetings recur on a fixed four-week (28-day) cadence anchored to a
// single chosen date/time. These pure helpers derive concrete future occurrences
// from that anchor — no calendar-month arithmetic, just 28-day steps.

export const OCCURRENCE_INTERVAL_DAYS = 28

const INTERVAL_MS = OCCURRENCE_INTERVAL_DAYS * 24 * 60 * 60 * 1000

/**
 * The first occurrence at or after `now`, stepping forward from `anchorAt` in
 * 28-day increments. If the anchor is in the future it is the next occurrence.
 */
export function computeNextOccurrence(anchorAt: Date, now: Date): Date {
  if (anchorAt.getTime() >= now.getTime()) {
    return new Date(anchorAt.getTime())
  }
  const elapsed = now.getTime() - anchorAt.getTime()
  const steps = Math.ceil(elapsed / INTERVAL_MS)
  return new Date(anchorAt.getTime() + steps * INTERVAL_MS)
}

/**
 * The next `count` occurrences at or after `now`, ascending. Returns an empty
 * array when `count` is zero or negative.
 */
export function computeUpcomingOccurrences(
  anchorAt: Date,
  now: Date,
  count: number,
): Array<Date> {
  if (count <= 0) return []
  const first = computeNextOccurrence(anchorAt, now)
  return Array.from(
    { length: count },
    (_, i) => new Date(first.getTime() + i * INTERVAL_MS),
  )
}

/**
 * The next occurrence from a nullable ISO anchor, or null when unscheduled.
 * Convenience for view code that holds anchors as serialized strings.
 */
export function nextOccurrenceFrom(
  anchorAt: string | null,
  now: Date,
): Date | null {
  if (!anchorAt) return null
  return computeNextOccurrence(new Date(anchorAt), now)
}
