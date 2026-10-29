import type { examAttemptStatusEnum, examQuestions, exams } from '@/db/schema'

export type ExamStatus = (typeof exams.$inferSelect)['status']
export type ExamAttemptStatus =
  (typeof examAttemptStatusEnum.enumValues)[number]
export type ExamQuestionType = (typeof examQuestions.$inferSelect)['type']

type PublishQuestion = {
  id: string
  type: ExamQuestionType
  prompt: string
}

type PublishOption = {
  isCorrect: boolean
}

export type ExamAuthorAccess = {
  /** Admin or a Teacher-user holding the `exam_management` Staff Privilege. */
  canManage: boolean
  isCreator: boolean
}

/**
 * Exams are editable while draft for teachers/creators, and always editable
 * by exam managers (admins or `exam_management` holders) even after
 * publishing.
 */
export function canEditExam(status: ExamStatus, canManage = false): boolean {
  return status === 'draft' || canManage
}

export function canAuthorEditExam(
  status: ExamStatus,
  access: ExamAuthorAccess,
): boolean {
  if (access.canManage) return true
  return status === 'draft' && access.isCreator
}

/** Only draft exams may be deleted; published exams keep their attempts. */
export function canDeleteExam(status: ExamStatus): boolean {
  return status === 'draft'
}

/**
 * The per-question structure a save may produce — shared by the request
 * schema and the authoring transaction so a bypass cannot persist a key the
 * rescore would silently grade against: multiple choice keeps at least two
 * options with exactly one correct; open-ended keeps none. Repeated option
 * ids collapse to one row on write (the last entry wins), so they count once.
 */
export function questionStructureErrors(question: {
  type: ExamQuestionType
  options: Array<{ id?: string; isCorrect?: boolean }>
}): Array<string> {
  const keptById = new Map<string, { isCorrect?: boolean }>()
  const fresh: Array<{ isCorrect?: boolean }> = []
  for (const option of question.options) {
    if (option.id) keptById.set(option.id, option)
    else fresh.push(option)
  }
  const options = [...keptById.values(), ...fresh]
  if (question.type === 'multiple_choice') {
    const errors: Array<string> = []
    if (options.length < 2) {
      errors.push('Multiple choice questions need at least 2 options')
    }
    if (options.filter((option) => option.isCorrect).length !== 1) {
      errors.push('Exactly one option must be marked correct')
    }
    return errors
  }
  return options.length > 0 ? ['Open-ended questions cannot have options'] : []
}

/**
 * Validates an exam for publishing. Returns a list of human-readable errors;
 * empty means publishable.
 */
export function validateForPublish(
  questions: Array<PublishQuestion>,
  optionsByQuestion: Map<string, Array<PublishOption>>,
): Array<string> {
  const errors: Array<string> = []
  if (questions.length === 0) {
    errors.push('Exam must have at least one question')
  }
  for (const [index, question] of questions.entries()) {
    const label = `Question ${index + 1}`
    if (question.prompt.trim() === '') {
      errors.push(`${label}: prompt is empty`)
    }
    const options = optionsByQuestion.get(question.id) ?? []
    if (question.type === 'multiple_choice') {
      if (options.length < 2) {
        errors.push(`${label}: needs at least 2 options`)
      }
      const correctCount = options.filter((option) => option.isCorrect).length
      if (correctCount !== 1) {
        errors.push(`${label}: exactly one option must be marked correct`)
      }
    } else if (options.length > 0) {
      errors.push(`${label}: open-ended questions cannot have options`)
    }
  }
  return errors
}

const ATTEMPT_TRANSITIONS: Record<
  ExamAttemptStatus,
  Array<ExamAttemptStatus>
> = {
  in_progress: ['submitted'],
  submitted: ['graded'],
  graded: [],
}

/** Attempt lifecycle: in_progress → submitted → graded. */
export function canTransitionAttempt(
  from: ExamAttemptStatus,
  to: ExamAttemptStatus,
): boolean {
  return ATTEMPT_TRANSITIONS[from].includes(to)
}
