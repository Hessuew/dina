import type {
  CreateExamInput,
  FinalizeGradingInput,
  GetAttemptForGradingInput,
  GetAttemptForTakingInput,
  GetExamInput,
  GradeOpenAnswerInput,
  ListAttemptsForGradingInput,
  PublishExamInput,
  SaveAnswerInput,
  SaveExamChangesInput,
  StartAttemptInput,
  SubmitAttemptInput,
} from '@/schemas/exam.schema'
import type { LogLevel } from '@/utils/observability/logger'
import type {
  ExamAnswerRow,
  ExamAttemptRow,
  ExamQuestionRow,
  ExamRow,
} from '@/utils/exam/repository/exam.repository'
import type { StudentAttempt } from '@/utils/exam/domain/exam-redaction.domain'
import {
  applyAutoGradeResults,
  countAttemptsByExam,
  findAllExams,
  findAnswerById,
  findAnswersByAttempt,
  findAttemptByExamAndStudent,
  findAttemptById,
  findAttemptsByStudent,
  findAttemptsForGrading,
  findExamById,
  findExamTotalPointsMap,
  findPublishedExams,
  findQuestionsWithOptions,
  insertAttemptIfAbsent,
  insertExam,
  markAttemptGraded,
  markAttemptSubmittedIfInProgress,
  saveExamChanges,
  setExamStatus,
  updateAnswerGrade,
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
  canAuthorEditExam,
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
  isAppError,
} from '@/utils/errors'
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'

type ExamAttemptLogContext = {
  action: 'startExamAttempt' | 'saveExamAnswer' | 'submitExamAttempt'
  studentId: string
  attemptId?: string
  examId?: string
  startedAt: number
}

type ExamMutationAction = 'createExam' | 'saveExamChanges' | 'publishExam'

type ExamMutationLogContext = {
  action: ExamMutationAction
  actorId: string
  examId?: string
  startedAt: number
}

type ExamGradingAction = 'gradeOpenAnswer' | 'finalizeGrading'

type ExamGradingLogContext = {
  action: ExamGradingAction
  graderId: string
  attemptId?: string
  examId?: string
  answerId?: string
  questionId?: string
  startedAt: number
}

function logExamAttemptEvent(
  level: LogLevel,
  event: string,
  context: ExamAttemptLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    studentId: context.studentId,
    attemptId: context.attemptId,
    examId: context.examId,
    ...fields,
  })
}

function logExamMutationEvent(
  level: LogLevel,
  event: string,
  context: ExamMutationLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    examId: context.examId,
    ...fields,
  })
}

function logExamGradingEvent(
  level: LogLevel,
  event: string,
  context: ExamGradingLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    graderId: context.graderId,
    attemptId: context.attemptId,
    examId: context.examId,
    answerId: context.answerId,
    questionId: context.questionId,
    ...fields,
  })
}

function shouldLogExamFailure(error: unknown): boolean {
  return !isAppError(error) || error.status >= 500
}

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

/** Loads an exam and asserts the caller may edit it: creator or admin, draft only (or admin when published). */
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
  if (!canEditExam(exam.status, isAdmin)) {
    throw new ConflictError('A published exam can no longer be edited')
  }
  return exam
}

export async function createExamService(
  data: CreateExamInput,
  userId: string,
): Promise<ExamRow> {
  const context: ExamMutationLogContext = {
    action: 'createExam',
    actorId: userId,
    startedAt: performance.now(),
  }
  await assertTeacherOrAdmin(userId)
  const opensAt = new Date(data.opensAt)
  const closesAt = new Date(data.closesAt)
  if (closesAt.getTime() <= opensAt.getTime()) {
    throw new ValidationError('Close date must be after open date')
  }
  try {
    const exam = await insertExam({
      title: data.title,
      ...(data.durationMinutes !== undefined
        ? { durationMinutes: data.durationMinutes }
        : {}),
      opensAt,
      closesAt,
      createdBy: userId,
    })
    context.examId = exam.id
    logExamMutationEvent('info', 'exam_created', context, {
      examStatus: exam.status,
      durationMinutes: exam.durationMinutes,
    })
    return exam
  } catch (error) {
    if (shouldLogExamFailure(error)) {
      logExamMutationEvent('error', 'exam_create_failed', context, {
        errorCategory: 'exam_persistence',
      })
    }
    throw error
  }
}

export async function saveExamChangesService(
  data: SaveExamChangesInput,
  userId: string,
): Promise<void> {
  const context: ExamMutationLogContext = {
    action: 'saveExamChanges',
    actorId: userId,
    examId: data.examId,
    startedAt: performance.now(),
  }
  try {
    const exam = await loadEditableExam(data.examId, userId)
    const opensAt = new Date(data.opensAt)
    const closesAt = new Date(data.closesAt)
    if (closesAt.getTime() <= opensAt.getTime()) {
      throw new ValidationError('Close date must be after open date')
    }
    const result = await saveExamChanges({
      examId: exam.id,
      title: data.title,
      durationMinutes: data.durationMinutes,
      opensAt,
      closesAt,
      questions: data.questions.map((question) => ({
        ...question,
        points: question.points ?? 1,
        options: question.options ?? [],
      })),
      deletedQuestionIds: data.deletedQuestionIds,
    })
    if (result.missingQuestionId) {
      throw new NotFoundError('Question not found')
    }
    logExamMutationEvent('info', 'exam_updated', context, {
      examStatus: exam.status,
      questionCount: data.questions.length,
      deletedQuestionCount: data.deletedQuestionIds.length,
    })
  } catch (error) {
    if (shouldLogExamFailure(error)) {
      logExamMutationEvent('error', 'exam_update_failed', context, {
        errorCategory: 'exam_persistence',
      })
    }
    throw error
  }
}

export async function publishExamService(
  data: PublishExamInput,
  userId: string,
): Promise<void> {
  const context: ExamMutationLogContext = {
    action: 'publishExam',
    actorId: userId,
    examId: data.examId,
    startedAt: performance.now(),
  }
  try {
    const exam = await loadEditableExam(data.examId, userId)
    if (exam.status === 'published') {
      throw new ConflictError('Exam is already published')
    }
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
    logExamMutationEvent('info', 'exam_published', context, {
      examStatus: 'published',
      questionCount: questions.length,
    })
  } catch (error) {
    if (shouldLogExamFailure(error)) {
      logExamMutationEvent('error', 'exam_publish_failed', context, {
        errorCategory: 'exam_persistence',
      })
    }
    throw error
  }
}

export async function getExamForAuthorService(
  data: GetExamInput,
  userId: string,
) {
  const { isAdmin } = await assertTeacherOrAdmin(userId)
  const exam = await findExamById(data.examId)
  if (!exam) throw new NotFoundError('Exam not found')
  const { questions, options } = await findQuestionsWithOptions(data.examId)
  const attemptCount = await countAttemptsByExam(data.examId)
  const canEdit = canAuthorEditExam(exam.status, {
    isAdmin,
    isCreator: exam.createdBy === userId,
  })
  return { exam, questions, options, attemptCount, canEdit }
}

export async function getExamsForTeacherService(userId: string) {
  await assertTeacherOrAdmin(userId)
  return findAllExams()
}

export type StudentExamListItem = {
  exam: Pick<
    ExamRow,
    'id' | 'title' | 'durationMinutes' | 'opensAt' | 'closesAt'
  > & {
    totalPoints: number
  }
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
  const pointsMap = await findExamTotalPointsMap(published.map((e) => e.id))
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
          totalPoints: pointsMap.get(exam.id) ?? 0,
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
    options: redactOptionsForStudent(options, attempt.status),
    answers: redactAnswersForStudent(answers, attempt.status),
    serverNow: new Date(),
  }
}

async function saveAnswerForAttempt(
  attempt: ExamAttemptRow,
  data: SaveAnswerInput,
): Promise<{
  answer: ExamAnswerRow
  question: ExamQuestionRow
  remainingMs: number
}> {
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
    answer,
    question,
    remainingMs: remainingMs(now, attempt.deadlineAt),
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
  const context: ExamAttemptLogContext = {
    action: 'startExamAttempt',
    studentId: userId,
    examId: data.examId,
    startedAt: performance.now(),
  }
  try {
    const existing = await findAttemptByExamAndStudent(data.examId, userId)
    if (existing) {
      context.attemptId = existing.id
      const attempt = await finalizeIfExpired(existing, new Date())
      const payload = await buildTakingPayload(attempt)
      logExamAttemptEvent('info', 'exam_attempt_resumed', context, {
        status: 'resumed',
        attemptStatus: attempt.status,
      })
      return payload
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
    context.attemptId = attempt.id
    const payload = await buildTakingPayload(attempt)
    logExamAttemptEvent('info', 'exam_attempt_started', context, {
      status: 'started',
      attemptStatus: attempt.status,
    })
    return payload
  } catch (error) {
    if (shouldLogExamFailure(error)) {
      logExamAttemptEvent('error', 'exam_attempt_start_failed', context, {
        errorCategory: 'exam_attempt_persistence',
      })
    }
    throw error
  }
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
  const context: ExamAttemptLogContext = {
    action: 'saveExamAnswer',
    studentId: userId,
    attemptId: data.attemptId,
    startedAt: performance.now(),
  }
  try {
    const attempt = await loadOwnAttempt(data.attemptId, userId)
    context.examId = attempt.examId
    const {
      answer,
      question,
      remainingMs: timeRemainingMs,
    } = await saveAnswerForAttempt(attempt, data)
    logExamAttemptEvent('info', 'exam_answer_saved', context, {
      status: 'saved',
      questionId: question.id,
      questionType: question.type,
    })
    return {
      savedAt: answer.updatedAt,
      remainingMs: timeRemainingMs,
    }
  } catch (error) {
    if (shouldLogExamFailure(error)) {
      logExamAttemptEvent('error', 'exam_answer_save_failed', context, {
        errorCategory: 'exam_answer_persistence',
      })
    }
    throw error
  }
}

export async function submitAttemptService(
  data: SubmitAttemptInput,
  userId: string,
): Promise<StudentAttempt> {
  const context: ExamAttemptLogContext = {
    action: 'submitExamAttempt',
    studentId: userId,
    startedAt: performance.now(),
  }
  const attempt = await loadOwnAttempt(data.attemptId, userId)
  context.attemptId = attempt.id
  context.examId = attempt.examId
  if (attempt.status !== 'in_progress') {
    logExamAttemptEvent('info', 'exam_attempt_submission_ignored', context, {
      status: 'already_finalized',
      attemptId: attempt.id,
      examId: attempt.examId,
      studentId: userId,
    })
    return redactAttemptForStudent(attempt)
  }
  const now = new Date()
  const submittedAt = isSaveAllowed(now, attempt.deadlineAt)
    ? now
    : attempt.deadlineAt
  try {
    const finalized = await finalizeAttempt(attempt, submittedAt)
    logExamAttemptEvent('info', 'exam_attempt_submitted', context, {
      status: finalized.status,
      attemptId: attempt.id,
      examId: attempt.examId,
      studentId: userId,
      submissionMode: submittedAt === now ? 'manual' : 'deadline',
    })
    return redactAttemptForStudent(finalized)
  } catch (error) {
    if (!isAppError(error) || error.status >= 500) {
      logExamAttemptEvent('error', 'exam_attempt_submission_failed', context, {
        errorCategory: isAppError(error) ? error.code : 'attempt_finalization',
        attemptId: attempt.id,
        examId: attempt.examId,
        studentId: userId,
      })
    }
    throw error
  }
}

export async function listAttemptsForGradingService(
  data: ListAttemptsForGradingInput,
  userId: string,
) {
  await assertTeacherOrAdmin(userId)
  const attempts = await findAttemptsForGrading(data.examId)
  const now = new Date()
  return Promise.all(
    attempts.map(async ({ studentName, ...attempt }) => ({
      ...(await finalizeIfExpired(attempt, now)),
      studentName,
    })),
  )
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
  const context: ExamGradingLogContext = {
    action: 'gradeOpenAnswer',
    graderId: userId,
    answerId: data.answerId,
    startedAt: performance.now(),
  }
  try {
    await assertTeacherOrAdmin(userId)
    const answer = await findAnswerById(data.answerId)
    if (!answer) throw new NotFoundError('Answer not found')
    context.attemptId = answer.attemptId
    const attempt = await findAttemptById(answer.attemptId)
    if (!attempt) throw new NotFoundError('Attempt not found')
    context.examId = attempt.examId
    if (attempt.status === 'in_progress') {
      throw new ConflictError(
        'Cannot grade an attempt that is still in progress',
      )
    }
    const { questions } = await findQuestionsWithOptions(attempt.examId)
    const question = questions.find((q) => q.id === answer.questionId)
    if (!question || question.type !== 'open_ended') {
      throw new ValidationError(
        'Only open-ended answers can be graded manually',
      )
    }
    context.questionId = question.id
    if (data.awardedPoints > question.points) {
      throw new ValidationError(
        `Points cannot exceed the question maximum (${question.points})`,
      )
    }
    await updateAnswerGrade(data.answerId, data.awardedPoints)
    logExamGradingEvent('info', 'exam_open_answer_graded', context, {
      status: 'graded',
      questionType: question.type,
    })
  } catch (error) {
    if (shouldLogExamFailure(error)) {
      logExamGradingEvent('error', 'exam_open_answer_grade_failed', context, {
        errorCategory: 'exam_grading_persistence',
      })
    }
    throw error
  }
}

export async function finalizeGradingService(
  data: FinalizeGradingInput,
  userId: string,
): Promise<void> {
  const context: ExamGradingLogContext = {
    action: 'finalizeGrading',
    graderId: userId,
    attemptId: data.attemptId,
    startedAt: performance.now(),
  }
  try {
    await assertTeacherOrAdmin(userId)
    const attempt = await findAttemptById(data.attemptId)
    if (!attempt) throw new NotFoundError('Attempt not found')
    context.examId = attempt.examId
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
    logExamGradingEvent('info', 'exam_grading_finalized', context, {
      status: 'graded',
    })
  } catch (error) {
    if (shouldLogExamFailure(error)) {
      logExamGradingEvent('error', 'exam_grading_finalize_failed', context, {
        errorCategory: 'exam_grading_persistence',
      })
    }
    throw error
  }
}
