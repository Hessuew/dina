type AssignmentRecord = {
  id: string
  lessonId: string
}

type LessonRecord = {
  id: string
  title: string
  courseId: string
  scheduledTime: Date | null
}

type CourseRecord = {
  id: string
  title: string
  isPublished: boolean | null
}

type SubmissionRecord = {
  assignmentId: string
}

export function buildStudentAssignments<
  TAssignment extends AssignmentRecord,
  TSubmission extends SubmissionRecord,
>(
  assignments: ReadonlyArray<TAssignment>,
  lessons: ReadonlyArray<LessonRecord>,
  courses: ReadonlyArray<CourseRecord>,
  submissions: ReadonlyArray<TSubmission>,
) {
  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const coursesById = new Map(courses.map((course) => [course.id, course]))
  const submissionsByAssignmentId = new Map<string, Array<TSubmission>>()

  for (const submission of submissions) {
    const assignmentSubmissions =
      submissionsByAssignmentId.get(submission.assignmentId) ?? []
    assignmentSubmissions.push(submission)
    submissionsByAssignmentId.set(
      submission.assignmentId,
      assignmentSubmissions,
    )
  }

  return assignments.flatMap((assignment) => {
    const lesson = lessonsById.get(assignment.lessonId)
    const course = lesson ? coursesById.get(lesson.courseId) : undefined
    if (!lesson || !course || !course.isPublished) return []

    return [
      {
        ...assignment,
        lesson: {
          id: lesson.id,
          title: lesson.title,
          scheduledTime: lesson.scheduledTime,
          course,
        },
        submissions: submissionsByAssignmentId.get(assignment.id) ?? [],
      },
    ]
  })
}
