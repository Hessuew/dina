import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OPTION_DRAFTS,
  buildUpsertQuestionInput,
  initialQuestionEditorState,
  questionSaveButtonLabel,
  questionSavedMessage,
} from './question-editor.domain'

describe('initialQuestionEditorState', () => {
  it('returns blank MC defaults for a new question', () => {
    const state = initialQuestionEditorState(null, [], false)
    expect(state).toEqual({
      questionId: null,
      isNew: true,
      typeLocked: false,
      type: 'multiple_choice',
      prompt: '',
      points: 1,
      optionDrafts: DEFAULT_OPTION_DRAFTS,
    })
    expect(state.optionDrafts[0]).not.toBe(DEFAULT_OPTION_DRAFTS[0])
  })

  it('locks the type for a read-only new editor', () => {
    expect(initialQuestionEditorState(null, [], true).typeLocked).toBe(true)
  })

  it('maps an existing MC question with its options and locks the type', () => {
    const state = initialQuestionEditorState(
      { id: 'q1', type: 'multiple_choice', prompt: 'Pick one', points: 2 },
      [
        { label: 'A', isCorrect: true },
        { label: 'B', isCorrect: false },
      ],
      false,
    )
    expect(state.questionId).toBe('q1')
    expect(state.isNew).toBe(false)
    expect(state.typeLocked).toBe(true)
    expect(state.type).toBe('multiple_choice')
    expect(state.prompt).toBe('Pick one')
    expect(state.points).toBe(2)
    expect(state.optionDrafts).toEqual([
      { label: 'A', isCorrect: true },
      { label: 'B', isCorrect: false },
    ])
  })

  it('gives an open-ended question default drafts for a later type switch', () => {
    const state = initialQuestionEditorState(
      { id: 'q1', type: 'open_ended', prompt: 'Explain', points: 3 },
      [],
      false,
    )
    expect(state.type).toBe('open_ended')
    expect(state.optionDrafts).toEqual(DEFAULT_OPTION_DRAFTS)
  })
})

describe('buildUpsertQuestionInput', () => {
  const base = {
    examId: 'e1',
    type: 'multiple_choice' as const,
    prompt: 'Pick',
    orderIndex: 0,
    points: 1,
    optionDrafts: [
      { label: 'A', isCorrect: true },
      { label: 'B', isCorrect: false },
    ],
  }

  it('includes questionId only for existing questions', () => {
    expect(buildUpsertQuestionInput({ ...base, questionId: 'q1' })).toHaveProperty(
      'questionId',
      'q1',
    )
    expect(
      buildUpsertQuestionInput({ ...base, questionId: null }),
    ).not.toHaveProperty('questionId')
  })

  it('indexes MC options and omits options for open-ended', () => {
    const mc = buildUpsertQuestionInput({ ...base, questionId: null })
    expect(mc.options).toEqual([
      { label: 'A', orderIndex: 0, isCorrect: true },
      { label: 'B', orderIndex: 1, isCorrect: false },
    ])
    const open = buildUpsertQuestionInput({
      ...base,
      questionId: null,
      type: 'open_ended',
    })
    expect(open.options).toBeUndefined()
  })
})

describe('labels', () => {
  it('distinguishes add from update', () => {
    expect(questionSavedMessage(true)).toBe('Question updated')
    expect(questionSavedMessage(false)).toBe('Question added')
    expect(questionSaveButtonLabel(true)).toBe('Save question')
    expect(questionSaveButtonLabel(false)).toBe('Add question')
  })
})
