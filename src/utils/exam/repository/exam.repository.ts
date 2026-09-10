import { and, asc, eq, inArray, notInArray, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import {
  examAnswers,
  examAttempts,
  examQuestionOptions,
  examQuestions,
  exams,
  profiles,
} from '@/db/schema'

export type ExamRow = typeof exams.$inferSelect
export type ExamQuestionRow = typeof examQuestions.$inferSelect
export type ExamQuestionOptionRow = typeof examQuestionOptions.$inferSelect
export type ExamAttemptRow = typeof examAttempts.$inferSelect
export type ExamAnswerRow = typeof examAnswers.$inferSelect

type QuestionOptionInput = {
  id?: string
  label: string
  orderIndex: number
  isCorrect: boolean
}

/* v8 ignore start */
export async function insertExam(
  data: Omit<typeof exams.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<ExamRow> {
  const db = await getDb()
  const [exam] = await db.insert(exams).values(data).returning()
  return exam
}

export async function findExamById(
  examId: string,
): Promise<ExamRow | undefined> {
  const db = await getDb()
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId))
  return exam
}

export async function findAllExams(): Promise<Array<ExamRow>> {
  const db = await getDb()
  return db.select().from(exams).orderBy(asc(exams.opensAt))
}

export async function findPublishedExams(): Promise<Array<ExamRow>> {
  const db = await getDb()
  return db
    .select()
    .from(exams)
    .where(eq(exams.status, 'published'))
    .orderBy(asc(exams.opensAt))
}

export async function setExamStatus(
  examId: string,
  status: ExamRow['status'],
): Promise<void> {
  const db = await getDb()
  await db
    .update(exams)
    .set({ status, updatedAt: new Date() })
    .where(eq(exams.id, examId))
}

export async function findQuestionsWithOptions(examId: string): Promise<{
  questions: Array<ExamQuestionRow>
  options: Array<ExamQuestionOptionRow>
}> {
  const db = await getDb()
  const questions = await db
    .select()
    .from(examQuestions)
    .where(eq(examQuestions.examId, examId))
    .orderBy(asc(examQuestions.orderIndex))
  const questionIds = questions.map((question) => question.id)
  const options =
    questionIds.length > 0
      ? await db
          .select()
          .from(examQuestionOptions)
          .where(inArray(examQuestionOptions.questionId, questionIds))
          .orderBy(asc(examQuestionOptions.orderIndex))
      : []
  return { questions, options }
}

type TransactionClient = Parameters<
  Parameters<Awaited<ReturnType<typeof getDb>>['transaction']>[0]
>[0]

async function replaceOptionsPreservingIds(
  tx: TransactionClient,
  questionId: string,
  options: Array<QuestionOptionInput>,
) {
  const optionsWithId = options.filter(
    (o): o is QuestionOptionInput & { id: string } => Boolean(o.id),
  )
  if (optionsWithId.length > 0) {
    const keepIds = optionsWithId.map((o) => o.id)
    await tx
      .delete(examQuestionOptions)
      .where(
        and(
          eq(examQuestionOptions.questionId, questionId),
          notInArray(examQuestionOptions.id, keepIds),
        ),
      )
    await tx
      .update(examQuestionOptions)
      .set({ isCorrect: false })
      .where(eq(examQuestionOptions.questionId, questionId))
    for (const option of options) {
      if (option.id) {
        await tx
          .update(examQuestionOptions)
          .set({
            label: option.label,
            orderIndex: option.orderIndex,
            isCorrect: option.isCorrect,
          })
          .where(eq(examQuestionOptions.id, option.id))
      } else {
        await tx.insert(examQuestionOptions).values({
          questionId,
          label: option.label,
          orderIndex: option.orderIndex,
          isCorrect: option.isCorrect,
        })
      }
    }
    return
  }

  await tx
    .delete(examQuestionOptions)
    .where(eq(examQuestionOptions.questionId, questionId))
  if (options.length > 0) {
    await tx
      .insert(examQuestionOptions)
      .values(options.map((option) => ({ ...option, questionId })))
  }
}

type ExamChangesQuestion = {
  questionId?: string
  type: ExamQuestionRow['type']
  prompt: string
  orderIndex: number
  points: number
  options: Array<QuestionOptionInput>
}

type SaveExamChangesData = {
  examId: string
  title: string
  durationMinutes: number
  opensAt: Date
  closesAt: Date
  questions: Array<ExamChangesQuestion>
  deletedQuestionIds: Array<string>
}

async function findMissingQuestionId(
  tx: TransactionClient,
  data: SaveExamChangesData,
): Promise<string | undefined> {
  const referencedIds = [
    ...data.questions.flatMap((question) =>
      question.questionId ? [question.questionId] : [],
    ),
    ...data.deletedQuestionIds,
  ]
  if (referencedIds.length === 0) return undefined
  const existingRows = await tx
    .select({ id: examQuestions.id })
    .from(examQuestions)
    .where(
      and(
        eq(examQuestions.examId, data.examId),
        inArray(examQuestions.id, referencedIds),
      ),
    )
  const existingIds = new Set(existingRows.map((row) => row.id))
  return referencedIds.find((questionId) => !existingIds.has(questionId))
}

async function updateExamInTransaction(
  tx: TransactionClient,
  data: SaveExamChangesData,
): Promise<void> {
  await tx
    .update(exams)
    .set({
      title: data.title,
      durationMinutes: data.durationMinutes,
      opensAt: data.opensAt,
      closesAt: data.closesAt,
      updatedAt: new Date(),
    })
    .where(eq(exams.id, data.examId))
}

async function deleteQuestionsInTransaction(
  tx: TransactionClient,
  data: SaveExamChangesData,
): Promise<void> {
  if (data.deletedQuestionIds.length === 0) return
  await tx
    .delete(examQuestions)
    .where(
      and(
        eq(examQuestions.examId, data.examId),
        inArray(examQuestions.id, data.deletedQuestionIds),
      ),
    )
}

async function updateQuestionInTransaction(
  tx: TransactionClient,
  examId: string,
  question: ExamChangesQuestion & { questionId: string },
): Promise<void> {
  await tx
    .update(examQuestions)
    .set({
      type: question.type,
      prompt: question.prompt,
      orderIndex: question.orderIndex,
      points: question.points,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(examQuestions.id, question.questionId),
        eq(examQuestions.examId, examId),
      ),
    )
  await replaceOptionsPreservingIds(tx, question.questionId, question.options)
}

async function insertQuestionInTransaction(
  tx: TransactionClient,
  examId: string,
  question: ExamChangesQuestion,
): Promise<void> {
  const [inserted] = await tx
    .insert(examQuestions)
    .values({
      examId,
      type: question.type,
      prompt: question.prompt,
      orderIndex: question.orderIndex,
      points: question.points,
    })
    .returning()
  await replaceOptionsPreservingIds(tx, inserted.id, question.options)
}

async function saveQuestionsInTransaction(
  tx: TransactionClient,
  data: SaveExamChangesData,
): Promise<void> {
  for (const question of data.questions) {
    if (question.questionId) {
      await updateQuestionInTransaction(tx, data.examId, {
        ...question,
        questionId: question.questionId,
      })
    } else {
      await insertQuestionInTransaction(tx, data.examId, question)
    }
  }
}

export async function saveExamChanges(
  data: SaveExamChangesData,
): Promise<{ missingQuestionId?: string }> {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const missingQuestionId = await findMissingQuestionId(tx, data)
    if (missingQuestionId) return { missingQuestionId }
    await updateExamInTransaction(tx, data)
    await deleteQuestionsInTransaction(tx, data)
    await saveQuestionsInTransaction(tx, data)
    return {}
  })
}

/**
 * Race-safe start: on a concurrent duplicate start the unique
 * (exam_id, student_id) constraint makes this a no-op and the caller
 * re-fetches the existing attempt.
 */
export async function insertAttemptIfAbsent(
  data: Omit<
    typeof examAttempts.$inferInsert,
    'id' | 'createdAt' | 'updatedAt'
  >,
): Promise<ExamAttemptRow | undefined> {
  const db = await getDb()
  const [attempt] = await db
    .insert(examAttempts)
    .values(data)
    .onConflictDoNothing({
      target: [examAttempts.examId, examAttempts.studentId],
    })
    .returning()
  return attempt
}

export async function findAttemptByExamAndStudent(
  examId: string,
  studentId: string,
): Promise<ExamAttemptRow | undefined> {
  const db = await getDb()
  const [attempt] = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.examId, examId),
        eq(examAttempts.studentId, studentId),
      ),
    )
  return attempt
}

export async function findAttemptById(
  attemptId: string,
): Promise<ExamAttemptRow | undefined> {
  const db = await getDb()
  const [attempt] = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
  return attempt
}

export async function findAttemptsByStudent(
  studentId: string,
): Promise<Array<ExamAttemptRow>> {
  const db = await getDb()
  return db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.studentId, studentId))
}

export async function findAttemptsForGrading(
  examId: string,
): Promise<Array<ExamAttemptRow & { studentName: string }>> {
  const db = await getDb()
  const rows = await db
    .select({ attempt: examAttempts, studentName: profiles.fullName })
    .from(examAttempts)
    .innerJoin(profiles, eq(examAttempts.studentId, profiles.id))
    .where(eq(examAttempts.examId, examId))
    .orderBy(asc(examAttempts.startedAt))
  return rows.map(({ attempt, studentName }) => ({ ...attempt, studentName }))
}

/**
 * Conditionally flips an in-progress attempt to submitted — the
 * double-finalize guard. Returns the updated row, or undefined when the
 * attempt was already submitted/graded (someone else finalized first).
 */
export async function markAttemptSubmittedIfInProgress(
  attemptId: string,
  submittedAt: Date,
  autoScore: number,
): Promise<ExamAttemptRow | undefined> {
  const db = await getDb()
  const [attempt] = await db
    .update(examAttempts)
    .set({ status: 'submitted', submittedAt, autoScore, updatedAt: new Date() })
    .where(
      and(
        eq(examAttempts.id, attemptId),
        eq(examAttempts.status, 'in_progress'),
      ),
    )
    .returning()
  return attempt
}

export async function markAttemptGraded(
  attemptId: string,
  scores: { autoScore: number; manualScore: number; totalScore: number },
  gradedBy: string,
): Promise<void> {
  const db = await getDb()
  await db
    .update(examAttempts)
    .set({
      status: 'graded',
      gradedAt: new Date(),
      gradedBy,
      ...scores,
      updatedAt: new Date(),
    })
    .where(eq(examAttempts.id, attemptId))
}

export async function upsertAnswer(data: {
  attemptId: string
  questionId: string
  selectedOptionId: string | null
  textAnswer: string | null
}): Promise<ExamAnswerRow> {
  const db = await getDb()
  const [answer] = await db
    .insert(examAnswers)
    .values(data)
    .onConflictDoUpdate({
      target: [examAnswers.attemptId, examAnswers.questionId],
      set: {
        selectedOptionId: data.selectedOptionId,
        textAnswer: data.textAnswer,
        updatedAt: new Date(),
      },
    })
    .returning()
  return answer
}

export async function findAnswersByAttempt(
  attemptId: string,
): Promise<Array<ExamAnswerRow>> {
  const db = await getDb()
  return db
    .select()
    .from(examAnswers)
    .where(eq(examAnswers.attemptId, attemptId))
}

export async function applyAutoGradeResults(
  results: Array<{
    answerId: string
    isCorrect: boolean
    awardedPoints: number
  }>,
): Promise<void> {
  if (results.length === 0) return
  const db = await getDb()
  await db.transaction(async (tx) => {
    for (const result of results) {
      await tx
        .update(examAnswers)
        .set({
          isCorrect: result.isCorrect,
          awardedPoints: result.awardedPoints,
          updatedAt: new Date(),
        })
        .where(eq(examAnswers.id, result.answerId))
    }
  })
}

export async function findAnswerById(
  answerId: string,
): Promise<ExamAnswerRow | undefined> {
  const db = await getDb()
  const [answer] = await db
    .select()
    .from(examAnswers)
    .where(eq(examAnswers.id, answerId))
  return answer
}

export async function updateAnswerGrade(
  answerId: string,
  awardedPoints: number,
): Promise<void> {
  const db = await getDb()
  await db
    .update(examAnswers)
    .set({ awardedPoints, updatedAt: new Date() })
    .where(eq(examAnswers.id, answerId))
}

export async function countAttemptsByExam(examId: string): Promise<number> {
  const db = await getDb()
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(examAttempts)
    .where(eq(examAttempts.examId, examId))
  return row.value
}

export async function findExamTotalPointsMap(
  examIds: Array<string>,
): Promise<Map<string, number>> {
  if (examIds.length === 0) return new Map()
  const db = await getDb()
  const rows = await db
    .select({
      examId: examQuestions.examId,
      totalPoints: sql<number>`coalesce(sum(${examQuestions.points}), 0)::int`,
    })
    .from(examQuestions)
    .where(inArray(examQuestions.examId, examIds))
    .groupBy(examQuestions.examId)
  return new Map(rows.map((row) => [row.examId, Number(row.totalPoints)]))
}
/* v8 ignore end */
