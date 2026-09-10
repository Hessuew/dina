import type { OptionDraft } from '@/components/exam/exam-editor/McOptionsEditor'
import type { ExamQuestionType } from '@/utils/exam/domain/exam-lifecycle.domain'

export const DEFAULT_OPTION_DRAFTS: Array<OptionDraft> = [
  { label: '', isCorrect: true },
  { label: '', isCorrect: false },
]

type EditorQuestionLike = {
  id: string
  type: ExamQuestionType
  prompt: string
  points: number
}

export type QuestionEditorInitialState = {
  questionId: string | null
  isNew: boolean
  typeLocked: boolean
  type: ExamQuestionType
  prompt: string
  points: number
  optionDrafts: Array<OptionDraft>
}

/** Initial editor state for an existing question, or blank MC defaults. */
export function initialQuestionEditorState(
  question: EditorQuestionLike | null,
  options: Array<{ id?: string; label: string; isCorrect: boolean }>,
  readOnly: boolean,
): QuestionEditorInitialState {
  if (question === null) {
    return {
      questionId: null,
      isNew: true,
      typeLocked: readOnly,
      type: 'multiple_choice',
      prompt: '',
      points: 1,
      optionDrafts: DEFAULT_OPTION_DRAFTS.map((draft) => ({ ...draft })),
    }
  }
  return {
    questionId: question.id,
    isNew: false,
    typeLocked: true,
    type: question.type,
    prompt: question.prompt,
    points: question.points,
    optionDrafts:
      question.type === 'multiple_choice'
        ? options.map((o) => ({
            ...(o.id ? { id: o.id } : {}),
            label: o.label,
            isCorrect: o.isCorrect,
          }))
        : DEFAULT_OPTION_DRAFTS.map((draft) => ({ ...draft })),
  }
}

type UpsertQuestionDraft = {
  examId: string
  questionId: string | null
  type: ExamQuestionType
  prompt: string
  orderIndex: number
  points: number
  optionDrafts: Array<OptionDraft>
}

export type QuestionChangeDraft = Omit<UpsertQuestionDraft, 'examId'>
export type QuestionEditorDraft = Omit<QuestionChangeDraft, 'orderIndex'>

export function questionEditorMode(
  questionId: string | null,
  readOnly: boolean,
): { isNew: boolean; typeLocked: boolean } {
  return {
    isNew: questionId === null,
    typeLocked: readOnly || questionId !== null,
  }
}

/** Server-fn input for upserting a question; options only for MC. */
export function buildQuestionChangeInput(draft: QuestionChangeDraft) {
  return {
    ...(draft.questionId !== null ? { questionId: draft.questionId } : {}),
    type: draft.type,
    prompt: draft.prompt,
    orderIndex: draft.orderIndex,
    points: draft.points,
    options:
      draft.type === 'multiple_choice'
        ? draft.optionDrafts.map((option, index) => ({
            ...(option.id ? { id: option.id } : {}),
            label: option.label,
            orderIndex: index,
            isCorrect: option.isCorrect,
          }))
        : undefined,
  }
}

export function buildUpsertQuestionInput(draft: UpsertQuestionDraft) {
  return { examId: draft.examId, ...buildQuestionChangeInput(draft) }
}
