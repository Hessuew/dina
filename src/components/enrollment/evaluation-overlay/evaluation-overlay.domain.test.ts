import { describe, expect, it } from 'vitest'
import {
  buildScorePatch,
  deriveEvaluationView,
  toggleScoreValue,
} from './evaluation-overlay.domain'
import type { EvaluationWithAuthor } from '@/utils/enrolment/repository/enrolment.repository'

function evaluation(
  overrides: Partial<EvaluationWithAuthor> = {},
): EvaluationWithAuthor {
  return {
    enrollmentId: 'enr-1',
    evaluatorId: 'user-1',
    evaluatorName: 'Reviewer One',
    score: null,
    admissionCategory: null,
    note: null,
    ...overrides,
  }
}

describe('deriveEvaluationView', () => {
  it('returns empty defaults when the current user has no evaluation', () => {
    const view = deriveEvaluationView({ evaluations: [], userId: 'user-1' })
    expect(view.myScore).toBeNull()
    expect(view.myNote).toBe('')
    expect(view.myAdmissionCategory).toBeNull()
    expect(view.admissionCategoryEnabled).toBe(false)
    expect(view.admissionCategoryMissing).toBe(false)
    expect(view.evaluationTotal).toBe(0)
    expect(view.evaluationCount).toBe(0)
    expect(view.otherEvaluators).toEqual([])
    expect(view.otherNotes).toEqual([])
  })

  it('reads the current user evaluation values', () => {
    const mine = evaluation({
      evaluatorId: 'user-1',
      score: 3,
      note: 'solid',
      admissionCategory: 'established',
    })
    const view = deriveEvaluationView({
      evaluations: [mine],
      userId: 'user-1',
    })
    expect(view.myScore).toBe(3)
    expect(view.myNote).toBe('solid')
    expect(view.myAdmissionCategory).toBe('established')
    expect(view.admissionCategoryEnabled).toBe(true)
    expect(view.admissionCategoryMissing).toBe(false)
  })

  it('flags a missing admission category when the score requires one', () => {
    const mine = evaluation({
      evaluatorId: 'user-1',
      score: 4,
      admissionCategory: null,
    })
    const view = deriveEvaluationView({
      evaluations: [mine],
      userId: 'user-1',
    })
    expect(view.admissionCategoryEnabled).toBe(true)
    expect(view.admissionCategoryMissing).toBe(true)
  })

  it('sums scores treating null as zero and counts only scored evaluations', () => {
    const view = deriveEvaluationView({
      evaluations: [
        evaluation({ evaluatorId: 'user-1', score: 3 }),
        evaluation({ evaluatorId: 'user-2', score: null }),
        evaluation({ evaluatorId: 'user-3', score: 2 }),
      ],
      userId: 'user-1',
    })
    expect(view.evaluationTotal).toBe(5)
    expect(view.evaluationCount).toBe(2)
  })

  it('separates other evaluators and keeps only their non-empty notes', () => {
    const view = deriveEvaluationView({
      evaluations: [
        evaluation({ evaluatorId: 'user-1', note: 'mine' }),
        evaluation({ evaluatorId: 'user-2', note: 'has note' }),
        evaluation({ evaluatorId: 'user-3', note: '   ' }),
        evaluation({ evaluatorId: 'user-4', note: null }),
      ],
      userId: 'user-1',
    })
    expect(view.otherEvaluators.map((e) => e.evaluatorId)).toEqual([
      'user-2',
      'user-3',
      'user-4',
    ])
    expect(view.otherNotes.map((e) => e.evaluatorId)).toEqual(['user-2'])
  })
})

describe('toggleScoreValue', () => {
  it('clears the score when re-selecting the active value', () => {
    expect(toggleScoreValue(3, 3)).toBeNull()
  })

  it('selects the new value when it differs from the active score', () => {
    expect(toggleScoreValue(2, 3)).toBe(2)
    expect(toggleScoreValue(1, null)).toBe(1)
  })
})

describe('buildScorePatch', () => {
  it('clears the admission category when score is null', () => {
    expect(buildScorePatch(null)).toEqual({
      score: null,
      admissionCategory: null,
    })
  })

  it('clears the admission category when score is below 3', () => {
    expect(buildScorePatch(2)).toEqual({ score: 2, admissionCategory: null })
    expect(buildScorePatch(0)).toEqual({ score: 0, admissionCategory: null })
  })

  it('keeps the admission category when score is 3 or higher', () => {
    expect(buildScorePatch(3)).toEqual({ score: 3 })
    expect(buildScorePatch(4)).toEqual({ score: 4 })
  })
})
