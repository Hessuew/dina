import type { ExamQuestionType } from './exam-lifecycle.domain'

type AnswerInput = {
  selectedOptionId?: string
  textAnswer?: string
}

/**
 * Validates that an answer matches its question type. Returns an error
 * message, or null when the shape is valid.
 */
export function validateAnswerShape(
  questionType: ExamQuestionType,
  answer: AnswerInput,
): string | null {
  if (questionType === 'multiple_choice') {
    if (!answer.selectedOptionId) {
      return 'Multiple choice answers require a selected option'
    }
    if (answer.textAnswer !== undefined) {
      return 'Multiple choice answers cannot include text'
    }
    return null
  }
  if (answer.selectedOptionId !== undefined) {
    return 'Open-ended answers cannot select an option'
  }
  if (answer.textAnswer === undefined) {
    return 'Open-ended answers require text'
  }
  return null
}

/** Guards against answering a question with an option from another question. */
export function isOptionOfQuestion(
  optionId: string,
  questionId: string,
  options: Array<{ id: string; questionId: string }>,
): boolean {
  return options.some(
    (option) => option.id === optionId && option.questionId === questionId,
  )
}
