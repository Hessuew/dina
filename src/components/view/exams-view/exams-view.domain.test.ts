import { describe, expect, it } from 'vitest'
import {
  deriveStudentCardViewModel,
  deriveStudentExamCardState,
  formatExamWindow,
  formatGradedScore,
  startExamButtonLabel,
  studentExamCardAction,
  studentExamCardTarget,
  studentLandingClosedMessage,
  studentLandingGoLabel,
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

describe('studentExamCardTarget', () => {
  it('keeps the start action on the instructions page', () => {
    expect(studentExamCardTarget('start')).toBe('/exams/$examId')
  })

  it('opens existing attempts directly', () => {
    expect(studentExamCardTarget('continue')).toBe('/exams/$examId/take')
    expect(studentExamCardTarget('review')).toBe('/exams/$examId/take')
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

describe('formatGradedScore', () => {
  it('formats score out of total points when totalScore is present', () => {
    expect(formatGradedScore(18, 20)).toBe('18 / 20')
    expect(formatGradedScore(0, 15)).toBe('0 / 15')
  })

  it('returns null when totalScore is null', () => {
    expect(formatGradedScore(null, 20)).toBeNull()
  })
})

describe('deriveStudentCardViewModel', () => {
  const baseExam = {
    durationMinutes: 45,
    opensAt,
    closesAt,
    totalPoints: 20,
  }

  it('derives view model for open unstarted exam', () => {
    const vm = deriveStudentCardViewModel({ exam: baseExam, attempt: null }, T0)
    expect(vm.state).toBe('open')
    expect(vm.action).toBe('start')
    expect(vm.stateLabel).toBe('Open')
    expect(vm.scoreDisplay).toBeNull()
    expect(vm.durationMinutes).toBe(45)
  })

  it('derives view model for graded attempt with score', () => {
    const vm = deriveStudentCardViewModel(
      {
        exam: baseExam,
        attempt: { status: 'graded', totalScore: 19 },
      },
      T0,
    )
    expect(vm.state).toBe('graded')
    expect(vm.action).toBe('review')
    expect(vm.stateLabel).toBe('Graded')
    expect(vm.scoreDisplay).toBe('19 / 20')
  })
})
