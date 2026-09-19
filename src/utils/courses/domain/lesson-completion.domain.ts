type PublishedAssignment = {
  id: string
  lessonId: string
}

type StudentSubmission = {
  assignmentId: string
  grade: number | null
}

export function buildCompletedLessonIds(
  lessonIds: ReadonlyArray<string>,
  assignments: ReadonlyArray<PublishedAssignment>,
  submissions: ReadonlyArray<StudentSubmission>,
): Array<string> {
  const gradedAssignmentIds = new Set(
    submissions
      .filter((submission) => submission.grade !== null)
      .map((submission) => submission.assignmentId),
  )
  const assignmentIdsByLesson = new Map<string, Array<string>>()

  for (const assignment of assignments) {
    const assignmentIds = assignmentIdsByLesson.get(assignment.lessonId) ?? []
    assignmentIds.push(assignment.id)
    assignmentIdsByLesson.set(assignment.lessonId, assignmentIds)
  }

  return lessonIds.filter((lessonId) => {
    const assignmentIds = assignmentIdsByLesson.get(lessonId) ?? []
    return (
      assignmentIds.length > 0 &&
      assignmentIds.every((assignmentId) =>
        gradedAssignmentIds.has(assignmentId),
      )
    )
  })
}
