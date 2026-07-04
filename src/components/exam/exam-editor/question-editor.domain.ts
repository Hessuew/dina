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
  options: Array<{ label: string; isCorrect: boolean }>,
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
        ? options.map((o) => ({ label: o.label, isCorrect: o.isCorrect }))
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

/** Server-fn input for upserting a question; options only for MC. */
export function buildUpsertQuestionInput(draft: UpsertQuestionDraft) {
  return {
    examId: draft.examId,
    ...(draft.questionId !== null ? { questionId: draft.questionId } : {}),
    type: draft.type,
    prompt: draft.prompt,
    orderIndex: draft.orderIndex,
    points: draft.points,
    options:
      draft.type === 'multiple_choice'
        ? draft.optionDrafts.map((option, index) => ({
            label: option.label,
            orderIndex: index,
            isCorrect: option.isCorrect,
          }))
        : undefined,
  }
}

export function questionSavedMessage(isExisting: boolean): string {
  return isExisting ? 'Question updated' : 'Question added'
}

export function questionSaveButtonLabel(isExisting: boolean): string {
  return isExisting ? 'Save question' : 'Add question'
}
