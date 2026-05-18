import { describe, expect, it } from 'vitest'
import { buildCalendarEvents } from './calendar.domain'

const makeLesson = (overrides: Partial<{
  id: string
  title: string
  scheduledTime: Date | null
  courseId: string
  courseName: string
  content: string | null
  duration: number | null
}> = {}) => ({
  id: 'l-1',
  title: 'Lesson 1',
  scheduledTime: new Date('2024-06-01T10:00:00Z'),
  courseId: 'c-1',
  courseName: 'Course 1',
  content: null,
  duration: null,
  ...overrides,
})

const makeAssignment = (overrides: Partial<{
  id: string
  title: string
  dueDate: Date
  courseId: string
  courseName: string
  description: string | null
  maxGrade: number | null
}> = {}) => ({
  id: 'a-1',
  title: 'Assignment 1',
  dueDate: new Date('2024-06-02T10:00:00Z'),
  courseId: 'c-1',
  courseName: 'Course 1',
  description: null,
  maxGrade: null,
  ...overrides,
})

const makeSpecialEvent = (overrides: Partial<{
  id: string
  title: string
  startTime: Date
  courseId: string | null
  description: string | null
  category: 'exam' | 'chapel' | 'personal' | null
}> = {}) => ({
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
    expect(buildCalendarEvents([makeLesson({ scheduledTime: null })], [], [])).toEqual([])
  })

  it('maps an assignment to CalendarEvent with type "assignment" and maxGrade', () => {
    const [result] = buildCalendarEvents([], [makeAssignment({ maxGrade: 50 })], [])
    expect(result.type).toBe('assignment')
    expect(result.id).toBe('a-1')
    expect(result.maxGrade).toBe(50)
  })

  it('maps a special event with null courseId to empty string courseId', () => {
    const [result] = buildCalendarEvents([], [], [makeSpecialEvent({ category: 'exam' })])
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
