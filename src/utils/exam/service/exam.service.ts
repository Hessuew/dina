import type {
  CreateExamInput,
  DeleteExamInput,
  DeleteQuestionInput,
  FinalizeGradingInput,
  GetAttemptForGradingInput,
  GetAttemptForTakingInput,
  GetExamInput,
  GradeOpenAnswerInput,
  ListAttemptsForGradingInput,
  PublishExamInput,
  ReorderQuestionsInput,
  SaveAnswerInput,
  StartAttemptInput,
  SubmitAttemptInput,
  UpdateExamInput,
  UpsertQuestionInput,
} from '@/schemas/exam.schema'
import type {
  ExamAnswerRow,
  ExamAttemptRow,
  ExamRow,
} from '@/utils/exam/repository/exam.repository'
import type { StudentAttempt } from '@/utils/exam/domain/exam-redaction.domain'
import {
  applyAutoGradeResults,
  countAttemptsByExam,
  deleteExamById,
  deleteQuestionById,
  findAllExams,
  findAnswerById,
  findAnswersByAttempt,
  findAttemptByExamAndStudent,
  findAttemptById,
  findAttemptsByStudent,
  findAttemptsForGrading,
  findExamById,
  findPublishedExams,
  findQuestionsWithOptions,
  insertAttemptIfAbsent,
  insertExam,
  insertQuestionWithOptions,
  markAttemptGraded,
  markAttemptSubmittedIfInProgress,
  reorderQuestionsTx,
  setExamStatus,
  updateAnswerGrade,
  updateExamById,
  updateQuestionWithOptions,
  upsertAnswer,
} from '@/utils/exam/repository/exam.repository'
import {
  computeDeadline,
  isAttemptExpired,
  isSaveAllowed,
  isWithinStartWindow,
  remainingMs,
} from '@/utils/exam/domain/exam-timing.domain'
import {
  canEditExam,
  validateForPublish,
} from '@/utils/exam/domain/exam-lifecycle.domain'
import {
  allOpenAnswersGraded,
  autoGradeMultipleChoice,
  computeAttemptScores,
} from '@/utils/exam/domain/exam-grading.domain'
import {
  redactAnswersForStudent,
  redactAttemptForStudent,
  redactOptionsForStudent,
} from '@/utils/exam/domain/exam-redaction.domain'
import {
  isOptionOfQuestion,
  validateAnswerShape,
} from '@/utils/exam/domain/exam-answer.domain'
import { resolveAdminOrTeacherAccess } from '@/utils/authz'
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'

async function assertTeacherOrAdmin(userId: string): Promise<{
  isAdmin: boolean
  isTeacher: boolean
}> {
  const access = await resolveAdminOrTeacherAccess(userId)
  if (!access.isAdmin && !access.isTeacher) {
    throw new AuthorizationError('Only teachers and admins can manage exams')
  }
  return access
}

async function assertStudent(userId: string): Promise<void> {
  const access = await resolveAdminOrTeacherAccess(userId)
  if (access.isAdmin || access.isTeacher) {
    throw new AuthorizationError('Only students can take exams')
  }
}

/** Loads an exam and asserts the caller may edit it: creator or admin, draft only. */
async function loadEditableExam(
  examId: string,
  userId: string,
): Promise<ExamRow> {
  const { isAdmin } = await assertTeacherOrAdmin(userId)
  const exam = await findExamById(examId)
  if (!exam) throw new NotFoundError('Exam not found')
  if (!isAdmin && exam.createdBy !== userId) {
    throw new AuthorizationError(
      'Only the exam creator or an admin can edit it',
    )
  }
  if (!canEditExam(exam.status)) {
    throw new ConflictError('A published exam can no longer be edited')
  }
  return exam
}

export async function createExamService(
  data: CreateExamInput,
  userId: string,
): Promise<ExamRow> {
  await assertTeacherOrAdmin(userId)
  const opensAt = new Date(data.opensAt)
  const closesAt = new Date(data.closesAt)
  if (closesAt.getTime() <= opensAt.getTime()) {
    throw new ValidationError('Close date must be after open date')
  }
  return insertExam({
    title: data.title,
    ...(data.durationMinutes !== undefined
      ? { durationMinutes: data.durationMinutes }
      : {}),
    opensAt,
    closesAt,
    createdBy: userId,
  })
}

export async function updateExamService(
  data: UpdateExamInput,
  userId: string,
): Promise<ExamRow> {
  const exam = await loadEditableExam(data.examId, userId)
  const opensAt =
    data.opensAt !== undefined ? new Date(data.opensAt) : exam.opensAt
  const closesAt =
    data.closesAt !== undefined ? new Date(data.closesAt) : exam.closesAt
  if (closesAt.getTime() <= opensAt.getTime()) {
    throw new ValidationError('Close date must be after open date')
  }
  const updated = await updateExamById(data.examId, {
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.durationMinutes !== undefined
      ? { durationMinutes: data.durationMinutes }
      : {}),
    opensAt,
    closesAt,
  })
  if (!updated) throw new NotFoundError('Exam not found')
  return updated
}

export async function deleteExamService(
  data: DeleteExamInput,
  userId: string,
): Promise<void> {
  await loadEditableExam(data.examId, userId)
  await deleteExamById(data.examId)
}

export async function upsertQuestionService(
  data: UpsertQuestionInput,
  userId: string,
) {
  await loadEditableExam(data.examId, userId)
  const options = (data.options ?? []).map((option) => ({
    label: option.label,
    orderIndex: option.orderIndex,
    isCorrect: option.isCorrect,
  }))
  if (data.questionId !== undefined) {
    const updated = await updateQuestionWithOptions(
      data.examId,
      data.questionId,
      {
        type: data.type,
        prompt: data.prompt,
        orderIndex: data.orderIndex,
        ...(data.points !== undefined ? { points: data.points } : {}),
      },
      options,
    )
    if (!updated) throw new NotFoundError('Question not found')
    return updated
  }
  return insertQuestionWithOptions(
    {
      examId: data.examId,
      type: data.type,
      prompt: data.prompt,
      orderIndex: data.orderIndex,
      ...(data.points !== undefined ? { points: data.points } : {}),
    },
    options,
  )
}

export async function deleteQuestionService(
  data: DeleteQuestionInput,
  userId: string,
): Promise<void> {
  await loadEditableExam(data.examId, userId)
  await deleteQuestionById(data.examId, data.questionId)
}

export async function reorderQuestionsService(
  data: ReorderQuestionsInput,
  userId: string,
): Promise<void> {
  await loadEditableExam(data.examId, userId)
  await reorderQuestionsTx(data.examId, data.orderedQuestionIds)
}

export async function publishExamService(
  data: PublishExamInput,
  userId: string,
): Promise<void> {
  await loadEditableExam(data.examId, userId)
  const { questions, options } = await findQuestionsWithOptions(data.examId)
  const optionsByQuestion = new Map<string, Array<{ isCorrect: boolean }>>()
  for (const option of options) {
    const list = optionsByQuestion.get(option.questionId) ?? []
    list.push(option)
    optionsByQuestion.set(option.questionId, list)
  }
  const errors = validateForPublish(questions, optionsByQuestion)
  if (errors.length > 0) {
    throw new ValidationError(errors.join('; '))
  }
  await setExamStatus(data.examId, 'published')
}

export async function getExamForAuthorService(
  data: GetExamInput,
  userId: string,
) {
  await assertTeacherOrAdmin(userId)
  const exam = await findExamById(data.examId)
  if (!exam) throw new NotFoundError('Exam not found')
  const { questions, options } = await findQuestionsWithOptions(data.examId)
  const attemptCount = await countAttemptsByExam(data.examId)
  return { exam, questions, options, attemptCount }
}

export async function getExamsForTeacherService(userId: string) {
  await assertTeacherOrAdmin(userId)
  return findAllExams()
}

export type StudentExamListItem = {
  exam: Pick<
    ExamRow,
    'id' | 'title' | 'durationMinutes' | 'opensAt' | 'closesAt'
  >
  attempt: StudentAttempt | null
}

export async function getExamsForStudentService(
  userId: string,
): Promise<Array<StudentExamListItem>> {
  await assertStudent(userId)
  const [published, attempts] = await Promise.all([
    findPublishedExams(),
    findAttemptsByStudent(userId),
  ])
  const attemptByExam = new Map(attempts.map((a) => [a.examId, a]))
  const now = new Date()
  return published
    .filter(
      (exam) =>
        attemptByExam.has(exam.id) ||
        isWithinStartWindow(now, exam.opensAt, exam.closesAt) ||
        now.getTime() < exam.opensAt.getTime(),
    )
    .map((exam) => {
      const attempt = attemptByExam.get(exam.id)
      const finalized = attempt ? redactAttemptForStudent(attempt) : null
      return {
        exam: {
          id: exam.id,
          title: exam.title,
          durationMinutes: exam.durationMinutes,
          opensAt: exam.opensAt,
          closesAt: exam.closesAt,
        },
        attempt: finalized,
      }
    })
}

/**
 * Lazily finalizes an expired in-progress attempt: auto-grades multiple
 * choice from the saved answers and conditionally flips to submitted with
 * submittedAt = deadlineAt. Idempotent — a concurrent finalize wins the
 * conditional update and this call re-reads the result.
 */
async function finalizeIfExpired(
  attempt: ExamAttemptRow,
  now: Date,
): Promise<ExamAttemptRow> {
  if (
    attempt.status !== 'in_progress' ||
    !isAttemptExpired(now, attempt.deadlineAt)
  ) {
    return attempt
  }
  return finalizeAttempt(attempt, attempt.deadlineAt)
}

async function finalizeAttempt(
  attempt: ExamAttemptRow,
  submittedAt: Date,
): Promise<ExamAttemptRow> {
  const [{ questions, options }, answers] = await Promise.all([
    findQuestionsWithOptions(attempt.examId),
    findAnswersByAttempt(attempt.id),
  ])
  const results = autoGradeMultipleChoice(answers, questions, options)
  await applyAutoGradeResults(results)
  const autoScore = results.reduce((sum, r) => sum + r.awardedPoints, 0)
  const flipped = await markAttemptSubmittedIfInProgress(
    attempt.id,
    submittedAt,
    autoScore,
  )
  if (flipped) return flipped
  const current = await findAttemptById(attempt.id)
  if (!current) throw new NotFoundError('Attempt not found')
  return current
}

async function loadOwnAttempt(
  attemptId: string,
  userId: string,
): Promise<ExamAttemptRow> {
  const attempt = await findAttemptById(attemptId)
  if (!attempt || attempt.studentId !== userId) {
    throw new NotFoundError('Attempt not found')
  }
  return attempt
}

type TakingPayload = {
  attempt: StudentAttempt
  questions: Awaited<ReturnType<typeof findQuestionsWithOptions>>['questions']
  options: ReturnType<typeof redactOptionsForStudent>
  answers: Array<ExamAnswerRow>
  serverNow: Date
}

async function buildTakingPayload(
  attempt: ExamAttemptRow,
): Promise<TakingPayload> {
  const [{ questions, options }, answers] = await Promise.all([
    findQuestionsWithOptions(attempt.examId),
    findAnswersByAttempt(attempt.id),
  ])
  return {
    attempt: redactAttemptForStudent(attempt),
    questions,
    options: redactOptionsForStudent(options),
    answers: redactAnswersForStudent(answers, attempt.status),
    serverNow: new Date(),
  }
}

export async function startAttemptService(
  data: StartAttemptInput,
  userId: string,
): Promise<TakingPayload> {
  await assertStudent(userId)
  const exam = await findExamById(data.examId)
  if (!exam || exam.status !== 'published') {
    throw new NotFoundError('Exam not found')
  }
  const existing = await findAttemptByExamAndStudent(data.examId, userId)
  if (existing) {
    return buildTakingPayload(await finalizeIfExpired(existing, new Date()))
  }
  const now = new Date()
  if (!isWithinStartWindow(now, exam.opensAt, exam.closesAt)) {
    throw new ValidationError('This exam is not open for starting right now')
  }
  const inserted = await insertAttemptIfAbsent({
    examId: data.examId,
    studentId: userId,
    startedAt: now,
    deadlineAt: computeDeadline(now, exam.durationMinutes),
  })
  const attempt =
    inserted ?? (await findAttemptByExamAndStudent(data.examId, userId))
  if (!attempt) throw new NotFoundError('Attempt not found')
  return buildTakingPayload(attempt)
}

export async function getAttemptForTakingService(
  data: GetAttemptForTakingInput,
  userId: string,
): Promise<TakingPayload> {
  await assertStudent(userId)
  const attempt = await findAttemptByExamAndStudent(data.examId, userId)
  if (!attempt) throw new NotFoundError('Attempt not found')
  return buildTakingPayload(await finalizeIfExpired(attempt, new Date()))
}

export async function saveAnswerService(
  data: SaveAnswerInput,
  userId: string,
): Promise<{ savedAt: Date; remainingMs: number }> {
  const attempt = await loadOwnAttempt(data.attemptId, userId)
  const now = new Date()
  if (attempt.status !== 'in_progress') {
    throw new ValidationError('This attempt is no longer in progress', {
      details: { attemptId: attempt.id },
    })
  }
  if (!isSaveAllowed(now, attempt.deadlineAt)) {
    await finalizeIfExpired(attempt, now)
    throw new ValidationError('Exam time has expired', {
      details: { attemptId: attempt.id },
    })
  }
  const { questions, options } = await findQuestionsWithOptions(attempt.examId)
  const question = questions.find((q) => q.id === data.questionId)
  if (!question) throw new NotFoundError('Question not found')
  const shapeError = validateAnswerShape(question.type, data)
  if (shapeError) throw new ValidationError(shapeError)
  if (
    data.selectedOptionId !== undefined &&
    !isOptionOfQuestion(data.selectedOptionId, question.id, options)
  ) {
    throw new ValidationError(
      'Selected option does not belong to this question',
    )
  }
  const answer = await upsertAnswer({
    attemptId: attempt.id,
    questionId: question.id,
    selectedOptionId: data.selectedOptionId ?? null,
    textAnswer: data.textAnswer ?? null,
  })
  return {
    savedAt: answer.updatedAt,
    remainingMs: remainingMs(now, attempt.deadlineAt),
  }
}

export async function submitAttemptService(
  data: SubmitAttemptInput,
  userId: string,
): Promise<StudentAttempt> {
  const attempt = await loadOwnAttempt(data.attemptId, userId)
  if (attempt.status !== 'in_progress') {
    return redactAttemptForStudent(attempt)
  }
  const now = new Date()
  const submittedAt = isSaveAllowed(now, attempt.deadlineAt)
    ? now
    : attempt.deadlineAt
  return redactAttemptForStudent(await finalizeAttempt(attempt, submittedAt))
}

export async function listAttemptsForGradingService(
  data: ListAttemptsForGradingInput,
  userId: string,
) {
  await assertTeacherOrAdmin(userId)
  const attempts = await findAttemptsForGrading(data.examId)
  const now = new Date()
  return Promise.all(attempts.map((attempt) => finalizeIfExpired(attempt, now)))
}

export async function getAttemptForGradingService(
  data: GetAttemptForGradingInput,
  userId: string,
) {
  await assertTeacherOrAdmin(userId)
  const attempt = await findAttemptById(data.attemptId)
  if (!attempt) throw new NotFoundError('Attempt not found')
  const finalized = await finalizeIfExpired(attempt, new Date())
  const [{ questions, options }, answers] = await Promise.all([
    findQuestionsWithOptions(finalized.examId),
    findAnswersByAttempt(finalized.id),
  ])
  return { attempt: finalized, questions, options, answers }
}

export async function gradeOpenAnswerService(
  data: GradeOpenAnswerInput,
  userId: string,
): Promise<void> {
  await assertTeacherOrAdmin(userId)
  const answer = await findAnswerById(data.answerId)
  if (!answer) throw new NotFoundError('Answer not found')
  const attempt = await findAttemptById(answer.attemptId)
  if (!attempt) throw new NotFoundError('Attempt not found')
  if (attempt.status === 'in_progress') {
    throw new ConflictError('Cannot grade an attempt that is still in progress')
  }
  const { questions } = await findQuestionsWithOptions(attempt.examId)
  const question = questions.find((q) => q.id === answer.questionId)
  if (!question || question.type !== 'open_ended') {
    throw new ValidationError('Only open-ended answers can be graded manually')
  }
  if (data.awardedPoints > question.points) {
    throw new ValidationError(
      `Points cannot exceed the question maximum (${question.points})`,
    )
  }
  await updateAnswerGrade(data.answerId, data.awardedPoints)
}

export async function finalizeGradingService(
  data: FinalizeGradingInput,
  userId: string,
): Promise<void> {
  await assertTeacherOrAdmin(userId)
  const attempt = await findAttemptById(data.attemptId)
  if (!attempt) throw new NotFoundError('Attempt not found')
  if (attempt.status !== 'submitted') {
    throw new ConflictError('Only submitted attempts can be finalized')
  }
  const [{ questions }, answers] = await Promise.all([
    findQuestionsWithOptions(attempt.examId),
    findAnswersByAttempt(attempt.id),
  ])
  if (!allOpenAnswersGraded(answers, questions)) {
    throw new ValidationError(
      'All answered open-ended questions must be graded first',
    )
  }
  const scores = computeAttemptScores(answers, questions)
  await markAttemptGraded(
    attempt.id,
    {
      autoScore: scores.autoScore,
      manualScore: scores.manualScore,
      totalScore: scores.totalScore,
    },
    userId,
  )
}
