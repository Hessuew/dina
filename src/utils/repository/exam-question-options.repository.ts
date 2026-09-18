import { and, asc, eq, inArray, notInArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { examQuestionOptions } from '@/db/schema'

export type ExamQuestionOptionRow = typeof examQuestionOptions.$inferSelect
export type ExamQuestionOptionInput = Pick<
  typeof examQuestionOptions.$inferInsert,
  'label' | 'orderIndex' | 'isCorrect'
> & { id?: string }
export type ExamQuestionOptionsTransactionClient = Parameters<
  Parameters<Awaited<ReturnType<typeof getDb>>['transaction']>[0]
>[0]

/* v8 ignore start */
export async function findExamQuestionOptionsByQuestionIds(
  questionIds: Array<string>,
): Promise<Array<ExamQuestionOptionRow>> {
  if (questionIds.length === 0) return []
  const db = await getDb()
  return db
    .select()
    .from(examQuestionOptions)
    .where(inArray(examQuestionOptions.questionId, questionIds))
    .orderBy(asc(examQuestionOptions.orderIndex))
}

export async function replaceExamQuestionOptionsInTransaction(
  tx: ExamQuestionOptionsTransactionClient,
  questionId: string,
  options: Array<ExamQuestionOptionInput>,
): Promise<void> {
  const optionsWithId = options.filter(
    (option): option is ExamQuestionOptionInput & { id: string } =>
      Boolean(option.id),
  )
  if (optionsWithId.length > 0) {
    const keepIds = optionsWithId.map((option) => option.id)
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
/* v8 ignore end */
