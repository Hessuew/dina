import { describe, expect, it } from 'vitest'
import {
  buildCalendarEvents,
  deriveCalendarCourses,
  deriveUpcomingEvents,
  deriveUpcomingSpecials,
  filterCalendarEvents,
  parseCalendarMonth,
} from './calendar.domain'
import type { CalendarEvent } from './calendar.domain'

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'ev-1',
  title: 'Event',
  date: new Date('2024-06-01T10:00:00Z'),
  type: 'lesson',
  courseId: 'c-1',
  courseName: 'Course 1',
  ...overrides,
})

const makeLesson = (
  overrides: Partial<{
    id: string
    title: string
    scheduledTime: Date | null
    courseId: string
    courseName: string
    content: string | null
    duration: number | null
  }> = {},
) => ({
  id: 'l-1',
  title: 'Lesson 1',
  scheduledTime: new Date('2024-06-01T10:00:00Z'),
  courseId: 'c-1',
  courseName: 'Course 1',
  content: null,
  duration: null,
  ...overrides,
})

const makeAssignment = (
  overrides: Partial<{
    id: string
    title: string
    dueDate: Date
    courseId: string
    courseName: string
    description: string | null
    maxGrade: number | null
  }> = {},
) => ({
  id: 'a-1',
  title: 'Assignment 1',
  dueDate: new Date('2024-06-02T10:00:00Z'),
  courseId: 'c-1',
  courseName: 'Course 1',
  description: null,
  maxGrade: null,
  ...overrides,
})

const makeSpecialEvent = (
  overrides: Partial<{
    id: string
    title: string
    startTime: Date
    courseId: string | null
    description: string | null
    category: 'exam' | 'chapel' | 'personal' | null
  }> = {},
) => ({
  id: 'e-1',
  title: 'Special Event',
  startTime: new Date('2024-06-03T10:00:00Z'),
  courseId: null,
  description: null,
  category: null,
  ...overrides,
})

describe('buildCalendarEvents', () => {
  it('returns empty array when all inputs are empty', () => {
    expect(buildCalendarEvents([], [], [])).toEqual([])
  })

  it('maps a lesson to CalendarEvent with type "lesson" and correct fields', () => {
    const [result] = buildCalendarEvents(
      [makeLesson({ content: 'Hello', duration: 90 })],
      [],
      [],
    )
    expect(result.type).toBe('lesson')
    expect(result.id).toBe('l-1')
    expect(result.date).toEqual(new Date('2024-06-01T10:00:00Z'))
    expect(result.description).toBe('Hello')
    expect(result.duration).toBe(90)
  })

  it('excludes lessons with null scheduledTime', () => {
    expect(
      buildCalendarEvents([makeLesson({ scheduledTime: null })], [], []),
    ).toEqual([])
  })

  it('maps an assignment to CalendarEvent with type "assignment" and maxGrade', () => {
    const [result] = buildCalendarEvents(
      [],
      [makeAssignment({ maxGrade: 50 })],
      [],
    )
    expect(result.type).toBe('assignment')
    expect(result.id).toBe('a-1')
    expect(result.maxGrade).toBe(50)
  })

  it('maps a special event with null courseId to empty string courseId', () => {
    const [result] = buildCalendarEvents(
      [],
      [],
      [makeSpecialEvent({ category: 'exam' })],
    )
    expect(result.type).toBe('special')
    expect(result.courseId).toBe('')
    expect(result.courseName).toBe('')
    expect(result.specialCategory).toBe('exam')
  })

  it('sets specialCategory to undefined when category is null', () => {
    const [result] = buildCalendarEvents([], [], [makeSpecialEvent()])
    expect(result.specialCategory).toBeUndefined()
  })

  it('sorts all events by date ascending across types', () => {
    const result = buildCalendarEvents(
      [makeLesson({ scheduledTime: new Date('2024-06-03T00:00:00Z') })],
      [makeAssignment({ dueDate: new Date('2024-06-01T00:00:00Z') })],
      [makeSpecialEvent({ startTime: new Date('2024-06-02T00:00:00Z') })],
    )
    expect(result[0].type).toBe('assignment')
    expect(result[1].type).toBe('special')
    expect(result[2].type).toBe('lesson')
  })
})

describe('deriveCalendarCourses', () => {
  it('excludes events without a courseId', () => {
    const result = deriveCalendarCourses([
      makeEvent({ courseId: '', courseName: 'No Course' }),
      makeEvent({ courseId: 'c-1', courseName: 'Course 1' }),
    ])
    expect(result).toEqual([{ id: 'c-1', name: 'Course 1' }])
  })

  it('deduplicates by courseId and sorts by name ascending', () => {
    const result = deriveCalendarCourses([
      makeEvent({ courseId: 'c-2', courseName: 'Zebra' }),
      makeEvent({ courseId: 'c-1', courseName: 'Alpha' }),
      makeEvent({ courseId: 'c-1', courseName: 'Alpha' }),
    ])
    expect(result).toEqual([
      { id: 'c-1', name: 'Alpha' },
      { id: 'c-2', name: 'Zebra' },
    ])
  })
})

describe('parseCalendarMonth', () => {
  const fallback = new Date('2026-01-01T00:00:00Z')

  it('returns the parsed month when valid', () => {
    expect(parseCalendarMonth('2026-06-01T00:00:00Z', fallback)).toEqual(
      new Date('2026-06-01T00:00:00Z'),
    )
  })

  it('falls back when the month is missing or invalid', () => {
    expect(parseCalendarMonth(undefined, fallback)).toBe(fallback)
    expect(parseCalendarMonth('not-a-date', fallback)).toBe(fallback)
  })
})

describe('filterCalendarEvents', () => {
  const events = [
    makeEvent({ id: 'a', courseId: 'c-1', type: 'lesson' }),
    makeEvent({ id: 'b', courseId: 'c-2', type: 'assignment' }),
  ]

  it('returns all events when course and type are "all"', () => {
    expect(filterCalendarEvents(events, 'all', 'all')).toHaveLength(2)
  })

  it('filters by course', () => {
    const result = filterCalendarEvents(events, 'c-1', 'all')
    expect(result.map((e) => e.id)).toEqual(['a'])
  })

  it('filters by type', () => {
    const result = filterCalendarEvents(events, 'all', 'assignment')
    expect(result.map((e) => e.id)).toEqual(['b'])
  })

  it('excludes events failing either filter', () => {
    expect(filterCalendarEvents(events, 'c-1', 'assignment')).toEqual([])
  })
})

describe('deriveUpcomingSpecials', () => {
  const now = new Date('2024-06-10T00:00:00Z')

  it('keeps only future special events and caps at 3', () => {
    const events = [
      makeEvent({ type: 'special', date: new Date('2024-06-09T00:00:00Z') }),
      makeEvent({ type: 'lesson', date: new Date('2024-06-11T00:00:00Z') }),
      makeEvent({ type: 'special', date: new Date('2024-06-11T00:00:00Z') }),
      makeEvent({ type: 'special', date: new Date('2024-06-12T00:00:00Z') }),
      makeEvent({ type: 'special', date: new Date('2024-06-13T00:00:00Z') }),
      makeEvent({ type: 'special', date: new Date('2024-06-14T00:00:00Z') }),
    ]
    expect(deriveUpcomingSpecials(events, now)).toHaveLength(3)
  })
})

describe('deriveUpcomingEvents', () => {
  const now = new Date('2024-06-10T00:00:00Z')

  it('keeps only future events of any type and caps at 5', () => {
    const events = Array.from({ length: 7 }, (_, i) =>
      makeEvent({ date: new Date(`2024-06-${11 + i}T00:00:00Z`) }),
    )
    events.push(makeEvent({ date: new Date('2024-06-01T00:00:00Z') }))
    expect(deriveUpcomingEvents(events, now)).toHaveLength(5)
  })
})
