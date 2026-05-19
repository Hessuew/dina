type SubmissionLike = { status: string }
type AssignmentLike = { id: string }
type CourseTeacherLike = { teacherId: string }

export function buildAssignmentStats(
  courseAssignments: Array<AssignmentLike>,
  studentSubmissions: Array<SubmissionLike>,
) {
  return {
    totalAssignments: courseAssignments.length,
    submittedCount: studentSubmissions.filter((s) => s.status === 'submitted')
      .length,
    gradedCount: studentSubmissions.filter((s) => s.status === 'graded').length,
  }
}

export function extractTeacherIds(courseTeachers: Array<CourseTeacherLike>) {
  return {
    teacher1Id: courseTeachers[0]?.teacherId ?? null,
    teacher2Id: courseTeachers[1]?.teacherId ?? null,
  }
}
