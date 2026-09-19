export type SubstitutionReviewerAssignment = {
  enrollmentId: string
  reviewerId: string
}

export type SubstitutionEvaluation = {
  enrollmentId: string
  evaluatorId: string
  score: number | null
}

/** Select assignments whose assigned reviewer has not submitted a score. */
export function selectUnscoredReviewerEnrollmentIds(
  assignments: ReadonlyArray<SubstitutionReviewerAssignment>,
  evaluations: ReadonlyArray<SubstitutionEvaluation>,
  reviewerId: string,
): Array<string> {
  const scoredEnrollmentIds = new Set(
    evaluations
      .filter(
        (evaluation) =>
          evaluation.evaluatorId === reviewerId && evaluation.score !== null,
      )
      .map((evaluation) => evaluation.enrollmentId),
  )

  return assignments
    .filter(
      (assignment) =>
        assignment.reviewerId === reviewerId &&
        !scoredEnrollmentIds.has(assignment.enrollmentId),
    )
    .map((assignment) => assignment.enrollmentId)
}
