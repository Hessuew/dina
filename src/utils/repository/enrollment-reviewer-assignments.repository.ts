import { eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { enrollmentReviewerAssignments } from '@/db/schema'

export type EnrollmentReviewerAssignmentsTransactionClient = Parameters<
  Parameters<Awaited<ReturnType<typeof getDb>>['transaction']>[0]
>[0]

/* v8 ignore start */
export async function findReviewerAssignmentForEnrollment(
  enrollmentId: string,
): Promise<{ reviewerId: string; courseId: string | null } | null> {
  const db = await getDb()
  const row = await db.query.enrollmentReviewerAssignments.findFirst({
    where: eq(enrollmentReviewerAssignments.enrollmentId, enrollmentId),
    columns: { reviewerId: true, courseId: true },
  })
  return row
    ? { reviewerId: row.reviewerId, courseId: row.courseId ?? null }
    : null
}

export async function bulkAssignEnrollments(
  assignments: Array<
    Pick<
      typeof enrollmentReviewerAssignments.$inferInsert,
      'enrollmentId' | 'reviewerId' | 'courseId'
    >
  >,
): Promise<void> {
  if (assignments.length === 0) return
  const db = await getDb()
  await db
    .insert(enrollmentReviewerAssignments)
    .values(assignments)
    .onConflictDoNothing()
}

export async function updateReviewerAssignmentsInTransaction(
  tx: EnrollmentReviewerAssignmentsTransactionClient,
  enrollmentIds: Array<string>,
  reviewerId: string,
  courseId: string,
): Promise<number> {
  if (enrollmentIds.length === 0) return 0
  const updated = await tx
    .update(enrollmentReviewerAssignments)
    .set({ reviewerId, courseId })
    .where(inArray(enrollmentReviewerAssignments.enrollmentId, enrollmentIds))
    .returning({ id: enrollmentReviewerAssignments.id })
  return updated.length
}
/* v8 ignore end */
