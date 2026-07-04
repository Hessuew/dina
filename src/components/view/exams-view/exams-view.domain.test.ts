import { describe, expect, it } from 'vitest'
import {
  deriveStudentExamCardState,
  formatExamWindow,
  startExamButtonLabel,
  studentExamCardAction,
  studentLandingClosedMessage,
  studentLandingGoLabel,
  toDatetimeLocalValue,
} from './exams-view.domain'

const T0 = new Date('2026-07-04T10:00:00.000Z')
const opensAt = new Date('2026-07-04T09:00:00.000Z')
const closesAt = new Date('2026-07-04T11:00:00.000Z')

describe('deriveStudentExamCardState', () => {
  it('prefers the attempt status over the window', () => {
    expect(
      deriveStudentExamCardState(
        { opensAt, closesAt, attemptStatus: 'in_progress' },
        T0,
      ),
    ).toBe('in_progress')
    expect(
      deriveStudentExamCardState(
        { opensAt, closesAt, attemptStatus: 'submitted' },
        T0,
      ),
    ).toBe('submitted')
    expect(
      deriveStudentExamCardState(
        { opensAt, closesAt, attemptStatus: 'graded' },
        T0,
      ),
    ).toBe('graded')
  })

  it('derives upcoming, open, and closed from the window', () => {
    const noAttempt = { opensAt, closesAt, attemptStatus: null }
    expect(
      deriveStudentExamCardState(noAttempt, new Date('2026-07-04T08:00:00Z')),
    ).toBe('upcoming')
    expect(deriveStudentExamCardState(noAttempt, T0)).toBe('open')
    expect(
      deriveStudentExamCardState(noAttempt, new Date('2026-07-04T12:00:00Z')),
    ).toBe('closed')
  })
})

describe('studentExamCardAction', () => {
  it('maps states to actions', () => {
    expect(studentExamCardAction('open')).toBe('start')
    expect(studentExamCardAction('in_progress')).toBe('continue')
    expect(studentExamCardAction('submitted')).toBe('review')
    expect(studentExamCardAction('graded')).toBe('review')
    expect(studentExamCardAction('upcoming')).toBeNull()
    expect(studentExamCardAction('closed')).toBeNull()
  })
})

describe('landing labels', () => {
  it('labels the go button per action', () => {
    expect(studentLandingGoLabel('continue')).toBe('Continue exam')
    expect(studentLandingGoLabel('review')).toBe('View submission')
  })

  it('explains why no action is available', () => {
    expect(studentLandingClosedMessage('upcoming')).toBe(
      'This exam has not opened yet.',
    )
    expect(studentLandingClosedMessage('closed')).toBe('This exam is closed.')
  })

  it('reflects pending state on the start button', () => {
    expect(startExamButtonLabel(false)).toBe('Start exam now')
    expect(startExamButtonLabel(true)).toBe('Starting…')
  })
})

describe('formatExamWindow', () => {
  it('renders an open–close range', () => {
    const formatted = formatExamWindow(opensAt, closesAt)
    expect(formatted).toContain('–')
    expect(formatted.length).toBeGreaterThan(10)
  })
})

describe('toDatetimeLocalValue', () => {
  it('formats a date for a datetime-local input', () => {
    const value = toDatetimeLocalValue(new Date(2026, 6, 4, 9, 5))
    expect(value).toBe('2026-07-04T09:05')
  })
})
