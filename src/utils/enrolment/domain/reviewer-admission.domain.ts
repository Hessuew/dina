import type {
  enrollmentEvaluations,
  enrollmentReviewerAssignments,
} from '@/db/schema'

type ReviewerAssignment = Pick<
  typeof enrollmentReviewerAssignments.$inferSelect,
  'enrollmentId' | 'reviewerId'
>

type EnrollmentEvaluation = Pick<
  typeof enrollmentEvaluations.$inferSelect,
  'enrollmentId' | 'evaluatorId' | 'score'
>

/** Returns enrollments whose assigned reviewer gave an admitting score. */
export function selectReviewerAdmittedEnrollmentIds(
  assignments: ReadonlyArray<ReviewerAssignment>,
  evaluations: ReadonlyArray<EnrollmentEvaluation>,
): Array<string> {
  const admittedEvaluations = new Set(
    evaluations
      .filter((evaluation) => evaluation.score === 3 || evaluation.score === 4)
      .map(
        (evaluation) => `${evaluation.enrollmentId}:${evaluation.evaluatorId}`,
      ),
  )

  return [
    ...new Set(
      assignments
        .filter((assignment) =>
          admittedEvaluations.has(
            `${assignment.enrollmentId}:${assignment.reviewerId}`,
          ),
        )
        .map((assignment) => assignment.enrollmentId),
    ),
  ]
}
