import { asc, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { enrollmentEvaluations } from '@/db/schema'

export type EnrollmentEvaluationsTransactionClient = Parameters<
  Parameters<Awaited<ReturnType<typeof getDb>>['transaction']>[0]
>[0]

/* v8 ignore start */

export async function findEnrollmentEvaluationsByEnrollmentIdsInTransaction(
  tx: EnrollmentEvaluationsTransactionClient,
  enrollmentIds: Array<string>,
) {
  if (enrollmentIds.length === 0) return []
  return tx
    .select({
      enrollmentId: enrollmentEvaluations.enrollmentId,
      evaluatorId: enrollmentEvaluations.evaluatorId,
      score: enrollmentEvaluations.score,
    })
    .from(enrollmentEvaluations)
    .where(inArray(enrollmentEvaluations.enrollmentId, enrollmentIds))
}

export async function findEnrollmentEvaluationsByEnrollmentIds(
  enrollmentIds: Array<string>,
) {
  if (enrollmentIds.length === 0) return []
  const db = await getDb()
  return db
    .select()
    .from(enrollmentEvaluations)
    .where(inArray(enrollmentEvaluations.enrollmentId, enrollmentIds))
    .orderBy(asc(enrollmentEvaluations.createdAt))
}

export async function findEnrollmentEvaluationScoresByEnrollmentIds(
  enrollmentIds: Array<string>,
) {
  if (enrollmentIds.length === 0) return []
  const db = await getDb()
  return db
    .select({
      enrollmentId: enrollmentEvaluations.enrollmentId,
      score: enrollmentEvaluations.score,
    })
    .from(enrollmentEvaluations)
    .where(inArray(enrollmentEvaluations.enrollmentId, enrollmentIds))
}

export async function findEnrollmentEvaluationTotalsByEnrollmentIds(
  enrollmentIds: Array<string>,
) {
  if (enrollmentIds.length === 0) return []
  const db = await getDb()
  const evaluationSum = sql<number>`coalesce(sum(${enrollmentEvaluations.score}), 0)::int`
  const evaluationCount = sql<number>`count(${enrollmentEvaluations.score})::int`
  return db
    .select({
      enrollmentId: enrollmentEvaluations.enrollmentId,
      evaluationSum,
      evaluationCount,
    })
    .from(enrollmentEvaluations)
    .where(inArray(enrollmentEvaluations.enrollmentId, enrollmentIds))
    .groupBy(enrollmentEvaluations.enrollmentId)
}

export async function findAllEnrollmentEvaluationScores() {
  const db = await getDb()
  return db
    .select({
      enrollmentId: enrollmentEvaluations.enrollmentId,
      evaluatorId: enrollmentEvaluations.evaluatorId,
      score: enrollmentEvaluations.score,
    })
    .from(enrollmentEvaluations)
}

export async function upsertEnrollmentEvaluation(
  enrollmentId: string,
  evaluatorId: string,
  patch: {
    score?: (typeof enrollmentEvaluations.$inferSelect)['score']
    admissionCategory?: (typeof enrollmentEvaluations.$inferSelect)['admissionCategory']
    note?: string
  },
) {
  const db = await getDb()
  await db
    .insert(enrollmentEvaluations)
    .values({
      enrollmentId,
      evaluatorId,
      score: patch.score ?? null,
      admissionCategory: patch.admissionCategory ?? null,
      note: patch.note ?? null,
    })
    .onConflictDoUpdate({
      target: [
        enrollmentEvaluations.enrollmentId,
        enrollmentEvaluations.evaluatorId,
      ],
      set: {
        ...(patch.score !== undefined
          ? {
              score: patch.score,
              ...(!patch.score || patch.score < 3
                ? { admissionCategory: null }
                : {}),
            }
          : {}),
        ...(patch.admissionCategory !== undefined
          ? { admissionCategory: patch.admissionCategory }
          : {}),
        ...(patch.note !== undefined ? { note: patch.note } : {}),
        updatedAt: new Date(),
      },
    })
}
/* v8 ignore end */
