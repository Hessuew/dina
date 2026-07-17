import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import {
  examAnswers,
  examAttempts,
  examQuestionOptions,
  examQuestions,
  exams,
} from '@/db/schema'

export type ExamRow = typeof exams.$inferSelect
export type ExamQuestionRow = typeof examQuestions.$inferSelect
export type ExamQuestionOptionRow = typeof examQuestionOptions.$inferSelect
export type ExamAttemptRow = typeof examAttempts.$inferSelect
export type ExamAnswerRow = typeof examAnswers.$inferSelect

export type QuestionOptionInput = {
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

export async function updateExamById(
  examId: string,
  data: Partial<
    Pick<
      typeof exams.$inferInsert,
      'title' | 'durationMinutes' | 'opensAt' | 'closesAt'
    >
  >,
): Promise<ExamRow | undefined> {
  const db = await getDb()
  const [exam] = await db
    .update(exams)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(exams.id, examId))
    .returning()
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

export async function insertQuestionWithOptions(
  question: Omit<
    typeof examQuestions.$inferInsert,
    'id' | 'createdAt' | 'updatedAt'
  >,
  options: Array<QuestionOptionInput>,
): Promise<ExamQuestionRow> {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(examQuestions)
      .values(question)
      .returning()
    if (options.length > 0) {
      await tx
        .insert(examQuestionOptions)
        .values(
          options.map((option) => ({ ...option, questionId: inserted.id })),
        )
    }
    return inserted
  })
}

export async function updateQuestionWithOptions(
  examId: string,
  questionId: string,
  question: Partial<
    Pick<
      typeof examQuestions.$inferInsert,
      'prompt' | 'orderIndex' | 'points' | 'type'
    >
  >,
  options: Array<QuestionOptionInput>,
): Promise<ExamQuestionRow | undefined> {
  const db = await getDb()
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(examQuestions)
      .set({ ...question, updatedAt: new Date() })
      .where(
        and(eq(examQuestions.id, questionId), eq(examQuestions.examId, examId)),
      )
      .returning()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- .returning() yields [] for a missing id; the destructured element is undefined at runtime
    if (!updated) return undefined
    // Replace options wholesale — draft-only editing makes this safe.
    await tx
      .delete(examQuestionOptions)
      .where(eq(examQuestionOptions.questionId, questionId))
    if (options.length > 0) {
      await tx
        .insert(examQuestionOptions)
        .values(options.map((option) => ({ ...option, questionId })))
    }
    return updated
  })
}

export async function deleteQuestionById(
  examId: string,
  questionId: string,
): Promise<void> {
  const db = await getDb()
  await db
    .delete(examQuestions)
    .where(
      and(eq(examQuestions.id, questionId), eq(examQuestions.examId, examId)),
    )
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
): Promise<Array<ExamAttemptRow>> {
  const db = await getDb()
  return db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.examId, examId))
    .orderBy(asc(examAttempts.startedAt))
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
/* v8 ignore end */
