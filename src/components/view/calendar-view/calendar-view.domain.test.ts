import { describe, expect, it } from 'vitest'
import {
  EVENT_STYLES,
  MAX_VISIBLE_DAY_EVENTS,
  buildCalendarDayCell,
  buildCalendarDays,
  getEventStyle,
} from './calendar-view.domain'
import type { CalendarEvent } from '@/utils/calendar/calendar'

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    title: 'Event',
    date: new Date(2026, 5, 15),
    type: 'lesson',
    courseId: 'c1',
    courseName: 'Course',
    ...overrides,
  }
}

describe('getEventStyle', () => {
  it('returns the special-category style when a special event has a category', () => {
    const event = makeEvent({ type: 'special', specialCategory: 'exam' })
    expect(getEventStyle(event)).toBe(EVENT_STYLES.exam)
  })

  it('falls back to the "other" style for an uncategorised special event', () => {
    const event = makeEvent({ type: 'special' })
    expect(getEventStyle(event)).toBe(EVENT_STYLES.other)
  })

  it('returns the lesson style for a lesson event', () => {
    expect(getEventStyle(makeEvent({ type: 'lesson' }))).toBe(
      EVENT_STYLES.lesson,
    )
  })

  it('returns the assignment style for an assignment event', () => {
    expect(getEventStyle(makeEvent({ type: 'assignment' }))).toBe(
      EVENT_STYLES.assignment,
    )
  })
})

describe('buildCalendarDays', () => {
  it('returns a whole number of weeks starting on Sunday and ending on Saturday', () => {
    const days = buildCalendarDays(new Date(2026, 5, 1))
    expect(days.length % 7).toBe(0)
    expect(days[0].getDay()).toBe(0)
    expect(days[days.length - 1].getDay()).toBe(6)
  })

  it('covers every day of the target month', () => {
    const days = buildCalendarDays(new Date(2026, 5, 1))
    const hasJune15 = days.some((d) => d.getMonth() === 5 && d.getDate() === 15)
    expect(hasJune15).toBe(true)
  })
})

describe('buildCalendarDayCell', () => {
  const currentDate = new Date(2026, 5, 15)
  const day = new Date(2026, 5, 15)

  it('selects only the events that fall on the given day', () => {
    const events = [
      makeEvent({ id: 'a', date: new Date(2026, 5, 15) }),
      makeEvent({ id: 'b', date: new Date(2026, 5, 16) }),
    ]
    const cell = buildCalendarDayCell({
      day,
      index: 0,
      totalDays: 35,
      currentDate,
      events,
      hasEventClick: true,
      today: new Date(2026, 0, 1),
    })
    expect(cell.visibleEvents.map((v) => v.event.id)).toEqual(['a'])
    expect(cell.overflowCount).toBe(0)
  })

  it('marks days inside and outside the current month', () => {
    const base = {
      index: 0,
      totalDays: 35,
      currentDate,
      events: [],
      hasEventClick: true,
      today: new Date(2026, 0, 1),
    }
    expect(
      buildCalendarDayCell({ ...base, day: new Date(2026, 5, 10) })
        .isDayInCurrentMonth,
    ).toBe(true)
    expect(
      buildCalendarDayCell({ ...base, day: new Date(2026, 4, 31) })
        .isDayInCurrentMonth,
    ).toBe(false)
  })

  it('marks today by comparing against the supplied today', () => {
    const cell = buildCalendarDayCell({
      day,
      index: 0,
      totalDays: 35,
      currentDate,
      events: [],
      hasEventClick: true,
      today: new Date(2026, 5, 15),
    })
    expect(cell.isToday).toBe(true)
  })

  it('defaults today to the current date when not supplied', () => {
    const now = new Date()
    const cell = buildCalendarDayCell({
      day: now,
      index: 0,
      totalDays: 35,
      currentDate: now,
      events: [],
      hasEventClick: true,
    })
    expect(cell.isToday).toBe(true)
  })

  it('flags the last row when the index is within the final week', () => {
    const base = {
      day,
      currentDate,
      events: [],
      hasEventClick: true,
      today: new Date(2026, 0, 1),
    }
    expect(
      buildCalendarDayCell({ ...base, index: 28, totalDays: 35 }).isLastRow,
    ).toBe(true)
    expect(
      buildCalendarDayCell({ ...base, index: 27, totalDays: 35 }).isLastRow,
    ).toBe(false)
  })

  it('caps visible events and reports the overflow count', () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({ id: `e${i}`, date: new Date(2026, 5, 15) }),
    )
    const cell = buildCalendarDayCell({
      day,
      index: 0,
      totalDays: 35,
      currentDate,
      events,
      hasEventClick: true,
      today: new Date(2026, 0, 1),
    })
    expect(cell.visibleEvents).toHaveLength(MAX_VISIBLE_DAY_EVENTS)
    expect(cell.overflowCount).toBe(2)
  })

  it('disables pointer events on pills when there is no click handler', () => {
    const events = [makeEvent({ date: new Date(2026, 5, 15) })]
    const withClick = buildCalendarDayCell({
      day,
      index: 0,
      totalDays: 35,
      currentDate,
      events,
      hasEventClick: true,
      today: new Date(2026, 0, 1),
    })
    const withoutClick = buildCalendarDayCell({
      day,
      index: 0,
      totalDays: 35,
      currentDate,
      events,
      hasEventClick: false,
      today: new Date(2026, 0, 1),
    })
    expect(withClick.visibleEvents[0].pillClassName).not.toContain(
      'pointer-events-none',
    )
    expect(withoutClick.visibleEvents[0].pillClassName).toContain(
      'pointer-events-none',
    )
    expect(withClick.visibleEvents[0].dotClassName).toContain('rounded-full')
  })

  it('builds the cell className from the last-row and month flags', () => {
    const notLastOutsideMonth = buildCalendarDayCell({
      day: new Date(2026, 4, 31),
      index: 0,
      totalDays: 35,
      currentDate,
      events: [],
      hasEventClick: true,
      today: new Date(2026, 0, 1),
    })
    expect(notLastOutsideMonth.cellClassName).toContain('border-b')
    expect(notLastOutsideMonth.cellClassName).toContain('bg-white/2')

    const lastRowToday = buildCalendarDayCell({
      day: new Date(2026, 5, 15),
      index: 28,
      totalDays: 35,
      currentDate,
      events: [],
      hasEventClick: true,
      today: new Date(2026, 5, 15),
    })
    expect(lastRowToday.cellClassName).not.toContain('border-b')
    expect(lastRowToday.cellClassName).toContain('bg-[#C5A059]/6')
  })

  it('styles the day number for today, in-month, and out-of-month cases', () => {
    const base = {
      index: 0,
      totalDays: 35,
      currentDate,
      events: [],
      hasEventClick: true,
    }
    const today = buildCalendarDayCell({
      ...base,
      day: new Date(2026, 5, 15),
      today: new Date(2026, 5, 15),
    })
    expect(today.dayNumberClassName).toContain('bg-[#C5A059]')

    const inMonth = buildCalendarDayCell({
      ...base,
      day: new Date(2026, 5, 10),
      today: new Date(2026, 0, 1),
    })
    expect(inMonth.dayNumberClassName).toContain('text-[#D6CCBE]')

    const outMonth = buildCalendarDayCell({
      ...base,
      day: new Date(2026, 4, 31),
      today: new Date(2026, 0, 1),
    })
    expect(outMonth.dayNumberClassName).toContain('text-[#8E816D]/50')
  })
})
