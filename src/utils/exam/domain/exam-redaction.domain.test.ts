import { describe, expect, it } from 'vitest'
import {
  redactAnswersForStudent,
  redactAttemptForStudent,
  redactOptionsForStudent,
} from './exam-redaction.domain'
import type { examAttempts, examQuestionOptions } from '@/db/schema'

type OptionRow = typeof examQuestionOptions.$inferSelect
type AttemptRow = typeof examAttempts.$inferSelect

const option: OptionRow = {
  id: 'o1',
  questionId: 'q1',
  label: 'Answer A',
  orderIndex: 0,
  isCorrect: true,
}

function attempt(overrides: Partial<AttemptRow>): AttemptRow {
  return {
    id: 'at1',
    examId: 'e1',
    studentId: 's1',
    status: 'in_progress',
    startedAt: new Date('2026-07-04T10:00:00Z'),
    deadlineAt: new Date('2026-07-04T10:30:00Z'),
    submittedAt: null,
    gradedAt: null,
    gradedBy: null,
    autoScore: 3,
    manualScore: 4,
    totalScore: 7,
    createdAt: new Date('2026-07-04T10:00:00Z'),
    updatedAt: new Date('2026-07-04T10:00:00Z'),
    ...overrides,
  }
}

describe('redactOptionsForStudent', () => {
  it('strips isCorrect and keeps everything else', () => {
    const redacted = redactOptionsForStudent([option])
    expect(redacted).toEqual([
      { id: 'o1', questionId: 'q1', label: 'Answer A', orderIndex: 0 },
    ])
    expect(redacted[0]).not.toHaveProperty('isCorrect')
  })
})

describe('redactAttemptForStudent', () => {
  it('hides scores while in progress or submitted', () => {
    for (const status of ['in_progress', 'submitted'] as const) {
      const redacted = redactAttemptForStudent(attempt({ status }))
      expect(redacted.autoScore).toBeNull()
      expect(redacted.manualScore).toBeNull()
      expect(redacted.totalScore).toBeNull()
    }
  })

  it('reveals scores once graded', () => {
    const redacted = redactAttemptForStudent(attempt({ status: 'graded' }))
    expect(redacted.totalScore).toBe(7)
    expect(redacted.autoScore).toBe(3)
    expect(redacted.manualScore).toBe(4)
  })

  it('never exposes gradedBy', () => {
    expect(
      redactAttemptForStudent(attempt({ status: 'graded', gradedBy: 't1' })),
    ).not.toHaveProperty('gradedBy')
  })
})

describe('redactAnswersForStudent', () => {
  const answers = [{ id: 'a1', isCorrect: true, awardedPoints: 2 }]

  it('hides correctness and points until graded', () => {
    for (const status of ['in_progress', 'submitted'] as const) {
      expect(redactAnswersForStudent(answers, status)).toEqual([
        { id: 'a1', isCorrect: null, awardedPoints: null },
      ])
    }
  })

  it('reveals correctness and points once graded', () => {
    expect(redactAnswersForStudent(answers, 'graded')).toEqual(answers)
  })
})
