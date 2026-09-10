import type { SaveExamChangesInput } from '@/schemas/exam.schema'
import type { ExamStatus } from '@/utils/exam/domain/exam-lifecycle.domain'
import type { QuestionEditorDraft } from '@/components/exam/exam-editor/question-editor.domain'
import {
  buildQuestionChangeInput,
  initialQuestionEditorState,
} from '@/components/exam/exam-editor/question-editor.domain'
import { parseDatetimeLocalValue, toDatetimeLocalValue } from '@/utils/datetime'

type ExamLike = {
  id: string
  title: string
  durationMinutes: number
  opensAt: Date
  closesAt: Date
  status: ExamStatus
}

type QuestionLike = {
  id: string
  type: QuestionEditorDraft['type']
  prompt: string
  points: number
}

export type ExamMetaDraft = {
  title: string
  durationMinutes: number
  opensAt: string
  closesAt: string
}

export type ExamQuestionDraft = QuestionEditorDraft

export function initialExamMetaDraft(exam: ExamLike): ExamMetaDraft {
  return {
    title: exam.title,
    durationMinutes: exam.durationMinutes,
    opensAt: toDatetimeLocalValue(exam.opensAt),
    closesAt: toDatetimeLocalValue(exam.closesAt),
  }
}

export function initialExamQuestionDraft(
  question: QuestionLike,
  options: Array<{ id?: string; label: string; isCorrect: boolean }>,
): ExamQuestionDraft {
  const initial = initialQuestionEditorState(question, options, false)
  return {
    questionId: initial.questionId,
    type: initial.type,
    prompt: initial.prompt,
    points: initial.points,
    optionDrafts: initial.optionDrafts,
  }
}

export function blankExamQuestionDraft(): ExamQuestionDraft {
  const initial = initialQuestionEditorState(null, [], false)
  return {
    questionId: initial.questionId,
    type: initial.type,
    prompt: initial.prompt,
    points: initial.points,
    optionDrafts: initial.optionDrafts,
  }
}

export function examMetaValidationMessage(
  meta: Pick<ExamMetaDraft, 'opensAt' | 'closesAt'>,
): string | null {
  const opensAt = parseDatetimeLocalValue(meta.opensAt)
  const closesAt = parseDatetimeLocalValue(meta.closesAt)
  if (!opensAt || !closesAt) return 'Enter valid open and close dates'
  return null
}

type ExamEditorSaveDraft = {
  examId: string
  meta: ExamMetaDraft
  questions: Array<ExamQuestionDraft>
  deletedQuestionIds: Array<string>
}

function hasDraftContent(question: ExamQuestionDraft): boolean {
  return (
    question.questionId !== null ||
    question.prompt.trim() !== '' ||
    question.optionDrafts.some((option) => option.label.trim() !== '')
  )
}

function toSaveDate(value: string): string {
  return parseDatetimeLocalValue(value)?.toISOString() ?? ''
}

export function buildSaveExamInput(
  draft: ExamEditorSaveDraft,
): SaveExamChangesInput {
  return {
    examId: draft.examId,
    title: draft.meta.title,
    durationMinutes: draft.meta.durationMinutes,
    opensAt: toSaveDate(draft.meta.opensAt),
    closesAt: toSaveDate(draft.meta.closesAt),
    questions: draft.questions
      .filter(hasDraftContent)
      .map((question, orderIndex) =>
        buildQuestionChangeInput({ ...question, orderIndex }),
      ),
    deletedQuestionIds: draft.deletedQuestionIds,
  }
}
