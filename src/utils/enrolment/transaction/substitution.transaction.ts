import { getDb } from '@/db'
import { selectUnscoredReviewerEnrollmentIds } from '@/utils/enrolment/domain/substitution.domain'
import {
  findEnrollmentEvaluationsByEnrollmentIdsInTransaction,
  findReviewerAssignmentsByReviewerIdInTransaction,
  insertCourseSubstituteInTransaction,
  updateReviewerAssignmentsInTransaction,
} from '@/utils/repository'

/* v8 ignore start */
/** Activates a substitution and reassigns unscored reviewer assignments atomically. */
export async function insertSubstitutionWithReassignment(
  courseId: string,
  substituteTeacherId: string,
  absentTeacherId: string,
): Promise<{ reassigned: number }> {
  const db = await getDb()
  return db.transaction(async (tx) => {
    await insertCourseSubstituteInTransaction(tx, {
      courseId,
      substituteTeacherId,
      absentTeacherId,
    })
    const assignments = await findReviewerAssignmentsByReviewerIdInTransaction(
      tx,
      absentTeacherId,
    )
    const evaluations =
      await findEnrollmentEvaluationsByEnrollmentIdsInTransaction(
        tx,
        assignments.map((assignment) => assignment.enrollmentId),
      )
    const enrollmentIds = selectUnscoredReviewerEnrollmentIds(
      assignments,
      evaluations,
      absentTeacherId,
    )
    const reassigned = await updateReviewerAssignmentsInTransaction(
      tx,
      enrollmentIds,
      substituteTeacherId,
      courseId,
    )
    return { reassigned }
  })
}
/* v8 ignore end */
