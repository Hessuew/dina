import { eq, inArray } from 'drizzle-orm'
import type { RepositoryTransactionClient } from './transaction-client'
import { getDb } from '@/db'
import { enrollmentReviewerAssignments } from '@/db/schema'

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

export async function findReviewerAssignmentsByEnrollmentIds(
  enrollmentIds: Array<string>,
): Promise<
  Array<{ enrollmentId: string; reviewerId: string; courseId: string | null }>
> {
  if (enrollmentIds.length === 0) return []
  const db = await getDb()
  const rows = await db
    .select({
      enrollmentId: enrollmentReviewerAssignments.enrollmentId,
      reviewerId: enrollmentReviewerAssignments.reviewerId,
      courseId: enrollmentReviewerAssignments.courseId,
    })
    .from(enrollmentReviewerAssignments)
    .where(inArray(enrollmentReviewerAssignments.enrollmentId, enrollmentIds))
  return rows.map((row) => ({ ...row, courseId: row.courseId ?? null }))
}

export async function findReviewerAssignmentsByCourseIds(
  courseIds: Array<string>,
): Promise<
  Array<{ enrollmentId: string; reviewerId: string; courseId: string | null }>
> {
  if (courseIds.length === 0) return []
  const db = await getDb()
  const rows = await db
    .select({
      enrollmentId: enrollmentReviewerAssignments.enrollmentId,
      reviewerId: enrollmentReviewerAssignments.reviewerId,
      courseId: enrollmentReviewerAssignments.courseId,
    })
    .from(enrollmentReviewerAssignments)
    .where(inArray(enrollmentReviewerAssignments.courseId, courseIds))
  return rows.map((row) => ({ ...row, courseId: row.courseId ?? null }))
}

export async function findReviewerAssignmentsByReviewerIds(
  reviewerIds: Array<string>,
): Promise<
  Array<{ enrollmentId: string; reviewerId: string; courseId: string | null }>
> {
  if (reviewerIds.length === 0) return []
  const db = await getDb()
  const rows = await db
    .select({
      enrollmentId: enrollmentReviewerAssignments.enrollmentId,
      reviewerId: enrollmentReviewerAssignments.reviewerId,
      courseId: enrollmentReviewerAssignments.courseId,
    })
    .from(enrollmentReviewerAssignments)
    .where(inArray(enrollmentReviewerAssignments.reviewerId, reviewerIds))
  return rows.map((row) => ({ ...row, courseId: row.courseId ?? null }))
}

export async function findAllReviewerAssignments(): Promise<
  Array<{ enrollmentId: string; reviewerId: string }>
> {
  const db = await getDb()
  return db
    .select({
      enrollmentId: enrollmentReviewerAssignments.enrollmentId,
      reviewerId: enrollmentReviewerAssignments.reviewerId,
    })
    .from(enrollmentReviewerAssignments)
}

export async function findReviewerAssignmentsByReviewerIdInTransaction(
  tx: RepositoryTransactionClient,
  reviewerId: string,
) {
  return tx
    .select({
      enrollmentId: enrollmentReviewerAssignments.enrollmentId,
      reviewerId: enrollmentReviewerAssignments.reviewerId,
    })
    .from(enrollmentReviewerAssignments)
    .where(eq(enrollmentReviewerAssignments.reviewerId, reviewerId))
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
  tx: RepositoryTransactionClient,
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
