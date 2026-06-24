import { describe, expect, it } from 'vitest'
import {
  OCCURRENCE_INTERVAL_DAYS,
  computeNextOccurrence,
  computeUpcomingOccurrences,
  nextOccurrenceFrom,
} from './discipleship-schedule.domain'

const DAY = 24 * 60 * 60 * 1000
const INTERVAL = OCCURRENCE_INTERVAL_DAYS * DAY

describe('computeNextOccurrence', () => {
  it('returns the anchor when it is in the future', () => {
    const anchor = new Date('2026-07-01T14:00:00.000Z')
    const now = new Date('2026-06-01T00:00:00.000Z')
    expect(computeNextOccurrence(anchor, now).toISOString()).toBe(
      anchor.toISOString(),
    )
  })

  it('returns the anchor when it is exactly now', () => {
    const anchor = new Date('2026-06-01T00:00:00.000Z')
    expect(computeNextOccurrence(anchor, anchor).toISOString()).toBe(
      anchor.toISOString(),
    )
  })

  it('advances to the occurrence exactly now when elapsed is a whole multiple', () => {
    const anchor = new Date('2026-01-01T00:00:00.000Z')
    const now = new Date(anchor.getTime() + 2 * INTERVAL)
    expect(computeNextOccurrence(anchor, now).getTime()).toBe(now.getTime())
  })

  it('rounds up to the next occurrence for a partial interval', () => {
    const anchor = new Date('2026-01-01T00:00:00.000Z')
    const now = new Date(anchor.getTime() + INTERVAL + DAY)
    expect(computeNextOccurrence(anchor, now).getTime()).toBe(
      anchor.getTime() + 2 * INTERVAL,
    )
  })
})

describe('computeUpcomingOccurrences', () => {
  it('returns an empty array for count of zero', () => {
    const anchor = new Date('2026-01-01T00:00:00.000Z')
    expect(computeUpcomingOccurrences(anchor, anchor, 0)).toEqual([])
  })

  it('returns an empty array for negative count', () => {
    const anchor = new Date('2026-01-01T00:00:00.000Z')
    expect(computeUpcomingOccurrences(anchor, anchor, -3)).toEqual([])
  })

  it('returns successive occurrences spaced one interval apart', () => {
    const anchor = new Date('2026-01-01T00:00:00.000Z')
    const now = new Date(anchor.getTime() + INTERVAL + DAY)
    const result = computeUpcomingOccurrences(anchor, now, 3)
    expect(result.map((d) => d.getTime())).toEqual([
      anchor.getTime() + 2 * INTERVAL,
      anchor.getTime() + 3 * INTERVAL,
      anchor.getTime() + 4 * INTERVAL,
    ])
  })
})

describe('nextOccurrenceFrom', () => {
  it('returns null when the anchor is null', () => {
    expect(nextOccurrenceFrom(null, new Date())).toBeNull()
  })

  it('returns the next occurrence from an ISO anchor', () => {
    const anchor = new Date('2026-01-01T00:00:00.000Z')
    const now = new Date(anchor.getTime() + INTERVAL + DAY)
    expect(nextOccurrenceFrom(anchor.toISOString(), now)?.getTime()).toBe(
      anchor.getTime() + 2 * INTERVAL,
    )
  })
})
