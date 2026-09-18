import { asc, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { enrollmentEvaluations } from '@/db/schema'

/* v8 ignore start */

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
