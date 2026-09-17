/* v8 ignore start */
import { and, eq, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { assignments, submissions } from '@/db/schema'

/**
 * Returns the lesson IDs, among `lessonIds`, that are complete for the student:
 * the lesson has at least one published assignment and every published
 * assignment has a submission by that student with a non-null grade.
 * Completion is derived from submissions — there is no stored progress row.
 * Lessons with zero published assignments are never completable.
 */
export async function findCompletedLessonIdsForStudent(
  studentId: string,
  lessonIds: Array<string>,
): Promise<Array<string>> {
  if (lessonIds.length === 0) return []
  const db = await getDb()
  const rows = await db
    .select({ lessonId: assignments.lessonId })
    .from(assignments)
    .leftJoin(
      submissions,
      and(
        eq(submissions.assignmentId, assignments.id),
        eq(submissions.studentId, studentId),
      ),
    )
    .where(
      and(
        inArray(assignments.lessonId, lessonIds),
        eq(assignments.status, 'published'),
      ),
    )
    .groupBy(assignments.lessonId)
    .having(sql`count(${submissions.grade}) = count(${assignments.id})`)
  return rows.map((row) => row.lessonId)
}
/* v8 ignore end */
