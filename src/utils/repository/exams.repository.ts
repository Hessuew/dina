import { and, asc, eq } from 'drizzle-orm'
import type { RepositoryTransactionClient } from './transaction-client'
import { getDb } from '@/db'
import { exams } from '@/db/schema'

export type ExamRow = typeof exams.$inferSelect
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

export async function deleteExamById(examId: string): Promise<boolean> {
  const db = await getDb()
  const deleted = await db
    .delete(exams)
    .where(and(eq(exams.id, examId), eq(exams.status, 'draft')))
    .returning({ id: exams.id })
  return deleted.length > 0
}

/**
 * Serializes exam scoring on the exams row: every path that reads the answer
 * key or saved answers to persist verdicts/scores takes this lock first, and
 * the authoring save takes it before its own key writes — so an in-flight
 * operation can never commit scores computed against a stale key.
 */
export async function lockExamInTransaction(
  tx: RepositoryTransactionClient,
  examId: string,
): Promise<void> {
  await tx
    .select({ id: exams.id })
    .from(exams)
    .where(eq(exams.id, examId))
    .for('no key update')
}

export async function updateExamInTransaction(
  tx: RepositoryTransactionClient,
  values: {
    examId: string
    title: string
    durationMinutes: number
    opensAt: Date
    closesAt: Date
  },
): Promise<void> {
  await tx
    .update(exams)
    .set({
      title: values.title,
      durationMinutes: values.durationMinutes,
      opensAt: values.opensAt,
      closesAt: values.closesAt,
      updatedAt: new Date(),
    })
    .where(eq(exams.id, values.examId))
}
/* v8 ignore end */
