import { describe, expect, it } from 'vitest'
import {
  blankExamQuestionDraft,
  buildSaveExamInput,
  examMetaValidationMessage,
  initialExamMetaDraft,
  initialExamQuestionDraft,
} from './exam-editor.domain'

const exam = {
  id: 'exam-1',
  title: 'Midterm',
  durationMinutes: 45,
  opensAt: new Date('2026-07-04T10:00:00.000Z'),
  closesAt: new Date('2026-07-04T12:00:00.000Z'),
  status: 'draft' as const,
}

describe('exam editor drafts', () => {
  it('maps exam metadata to editable browser values', () => {
    expect(initialExamMetaDraft(exam)).toMatchObject({
      title: 'Midterm',
      durationMinutes: 45,
    })
    expect(initialExamMetaDraft(exam).opensAt).toContain('T')
  })

  it('creates existing and blank question drafts', () => {
    const question = initialExamQuestionDraft(
      { id: 'q1', type: 'multiple_choice', prompt: 'Pick one', points: 2 },
      [{ id: 'o1', label: 'A', isCorrect: true }],
    )
    expect(question.questionId).toBe('q1')
    expect(question.optionDrafts).toEqual([
      { id: 'o1', label: 'A', isCorrect: true },
    ])
    expect(blankExamQuestionDraft().questionId).toBeNull()
  })
})

describe('buildSaveExamInput', () => {
  it('builds one payload and skips the untouched blank question', () => {
    const saved = buildSaveExamInput({
      examId: exam.id,
      meta: initialExamMetaDraft(exam),
      questions: [
        {
          questionId: 'q1',
          type: 'open_ended',
          prompt: 'Explain',
          points: 3,
          optionDrafts: [],
        },
        blankExamQuestionDraft(),
      ],
      deletedQuestionIds: ['q2'],
    })

    expect(saved.questions).toEqual([
      {
        questionId: 'q1',
        type: 'open_ended',
        prompt: 'Explain',
        points: 3,
        orderIndex: 0,
        options: undefined,
      },
    ])
    expect(saved.deletedQuestionIds).toEqual(['q2'])
    expect(saved.opensAt).toBe(
      new Date('2026-07-04T10:00:00.000Z').toISOString(),
    )
  })

  it('keeps a new question once it has content', () => {
    const question = blankExamQuestionDraft()
    question.prompt = 'New question'
    question.optionDrafts[0].label = 'A'
    const saved = buildSaveExamInput({
      examId: exam.id,
      meta: initialExamMetaDraft(exam),
      questions: [question],
      deletedQuestionIds: [],
    })

    expect(saved.questions[0]).toMatchObject({
      prompt: 'New question',
      orderIndex: 0,
    })
  })

  it('keeps a new question when only an option has content', () => {
    const question = blankExamQuestionDraft()
    question.optionDrafts[0].label = 'A'
    const saved = buildSaveExamInput({
      examId: exam.id,
      meta: initialExamMetaDraft(exam),
      questions: [question],
      deletedQuestionIds: [],
    })

    expect(saved.questions).toHaveLength(1)
  })

  it('keeps multiple new questions in their editor order', () => {
    const first = blankExamQuestionDraft()
    first.prompt = 'First new question'
    const second = blankExamQuestionDraft()
    second.prompt = 'Second new question'

    const saved = buildSaveExamInput({
      examId: exam.id,
      meta: initialExamMetaDraft(exam),
      questions: [first, second],
      deletedQuestionIds: [],
    })

    expect(saved.questions).toMatchObject([
      { prompt: 'First new question', orderIndex: 0 },
      { prompt: 'Second new question', orderIndex: 1 },
    ])
  })

  it('does not throw when a date field is empty', () => {
    const saved = buildSaveExamInput({
      examId: exam.id,
      meta: { ...initialExamMetaDraft(exam), opensAt: '' },
      questions: [],
      deletedQuestionIds: [],
    })

    expect(saved.opensAt).toBe('')
  })
})

describe('examMetaValidationMessage', () => {
  it('reports missing or invalid dates', () => {
    const meta = initialExamMetaDraft(exam)
    expect(examMetaValidationMessage({ ...meta, opensAt: '' })).toBe(
      'Enter valid open and close dates',
    )
    expect(examMetaValidationMessage({ ...meta, closesAt: 'not-a-date' })).toBe(
      'Enter valid open and close dates',
    )
  })

  it('accepts valid dates', () => {
    expect(examMetaValidationMessage(initialExamMetaDraft(exam))).toBeNull()
  })
})
