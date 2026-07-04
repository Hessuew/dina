import { describe, expect, it } from 'vitest'
import {
  allOpenAnswersGraded,
  autoGradeMultipleChoice,
  computeAttemptScores,
} from './exam-grading.domain'
import type { ExamQuestionType } from './exam-lifecycle.domain'

const questions = [
  { id: 'q1', type: 'multiple_choice' as ExamQuestionType, points: 2 },
  { id: 'q2', type: 'multiple_choice' as ExamQuestionType, points: 1 },
  { id: 'q3', type: 'open_ended' as ExamQuestionType, points: 5 },
]

const options = [
  { id: 'o1', questionId: 'q1', isCorrect: true },
  { id: 'o2', questionId: 'q1', isCorrect: false },
  { id: 'o3', questionId: 'q2', isCorrect: false },
  { id: 'o4', questionId: 'q2', isCorrect: true },
]

function answer(
  id: string,
  questionId: string,
  selectedOptionId: string | null,
  awardedPoints: number | null = null,
) {
  return { id, questionId, selectedOptionId, awardedPoints }
}

describe('autoGradeMultipleChoice', () => {
  it('awards full points for the correct option and zero otherwise', () => {
    const results = autoGradeMultipleChoice(
      [answer('a1', 'q1', 'o1'), answer('a2', 'q2', 'o3')],
      questions,
      options,
    )
    expect(results).toEqual([
      { answerId: 'a1', isCorrect: true, awardedPoints: 2 },
      { answerId: 'a2', isCorrect: false, awardedPoints: 0 },
    ])
  })

  it('marks an answer with no selected option incorrect', () => {
    const results = autoGradeMultipleChoice(
      [answer('a1', 'q1', null)],
      questions,
      options,
    )
    expect(results).toEqual([
      { answerId: 'a1', isCorrect: false, awardedPoints: 0 },
    ])
  })

  it('ignores open-ended answers and unknown questions', () => {
    const results = autoGradeMultipleChoice(
      [answer('a1', 'q3', null), answer('a2', 'missing', 'o1')],
      questions,
      options,
    )
    expect(results).toEqual([])
  })
})

describe('computeAttemptScores', () => {
  it('splits auto and manual scores and sums max', () => {
    const scores = computeAttemptScores(
      [
        answer('a1', 'q1', 'o1', 2),
        answer('a2', 'q2', 'o3', 0),
        answer('a3', 'q3', null, 4),
      ],
      questions,
    )
    expect(scores).toEqual({
      autoScore: 2,
      manualScore: 4,
      totalScore: 6,
      maxScore: 8,
    })
  })

  it('counts unanswered and ungraded questions as zero', () => {
    const scores = computeAttemptScores([answer('a1', 'q1', 'o1', null)], questions)
    expect(scores).toEqual({
      autoScore: 0,
      manualScore: 0,
      totalScore: 0,
      maxScore: 8,
    })
  })
})

describe('allOpenAnswersGraded', () => {
  it('is true when every answered open question has points', () => {
    expect(
      allOpenAnswersGraded([answer('a3', 'q3', null, 3)], questions),
    ).toBe(true)
  })

  it('is true when the open question was never answered', () => {
    expect(allOpenAnswersGraded([answer('a1', 'q1', 'o1', 2)], questions)).toBe(
      true,
    )
  })

  it('is false when an answered open question is ungraded', () => {
    expect(
      allOpenAnswersGraded([answer('a3', 'q3', null, null)], questions),
    ).toBe(false)
  })
})
