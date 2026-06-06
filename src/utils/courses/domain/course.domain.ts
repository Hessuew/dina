type SubmissionLike = { status: string }
type AssignmentLike = { id: string }
type CourseTeacherLike = { teacherId: string }
type AssignmentRef = { id: string; lessonId: string }
type SubmissionRef = { assignmentId: string; status: string }
type LessonEventRow = {
  id: string
  title: string
  scheduledTime: Date | null
  courseId: string
  courseName: string
}
type AssignmentEventRow = {
  id: string
  title: string
  dueDate: Date
  courseId: string
  courseName: string
}

export type CourseCalendarEvent = {
  id: string
  title: string
  date: Date
  type: 'lesson' | 'assignment'
  courseId: string
  courseName: string
}

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

export function buildCoursesWithProgress<
  T extends { lessons: Array<{ id: string }> },
>(
  courses: Array<T>,
  assignments: Array<AssignmentRef>,
  submissions: Array<SubmissionRef>,
): Array<
  T & {
    totalAssignments: number
    submittedAssignments: number
    gradedAssignments: number
  }
> {
  const assignmentsByLessonId = new Map<string, Array<AssignmentRef>>()
  for (const assignment of assignments) {
    const existing = assignmentsByLessonId.get(assignment.lessonId)
    if (existing) {
      existing.push(assignment)
    } else {
      assignmentsByLessonId.set(assignment.lessonId, [assignment])
    }
  }

  const submissionsByAssignmentId = new Map<string, Array<SubmissionRef>>()
  for (const submission of submissions) {
    const existing = submissionsByAssignmentId.get(submission.assignmentId)
    if (existing) {
      existing.push(submission)
    } else {
      submissionsByAssignmentId.set(submission.assignmentId, [submission])
    }
  }

  return courses.map((course) => {
    const courseAssignments = course.lessons.flatMap(
      (lesson) => assignmentsByLessonId.get(lesson.id) ?? [],
    )
    const courseSubmissions = courseAssignments.flatMap(
      (assignment) => submissionsByAssignmentId.get(assignment.id) ?? [],
    )
    const { totalAssignments, submittedCount, gradedCount } =
      buildAssignmentStats(courseAssignments, courseSubmissions)
    return {
      ...course,
      submittedAssignments: submittedCount,
      gradedAssignments: gradedCount,
      totalAssignments,
    }
  })
}

export function buildCourseCalendarEvents(
  lessonEvents: Array<LessonEventRow>,
  assignmentEvents: Array<AssignmentEventRow>,
): Array<CourseCalendarEvent> {
  return [
    ...lessonEvents
      .filter(
        (l): l is LessonEventRow & { scheduledTime: Date } =>
          l.scheduledTime !== null,
      )
      .map((l) => ({
        id: l.id,
        title: l.title,
        date: l.scheduledTime,
        type: 'lesson' as const,
        courseId: l.courseId,
        courseName: l.courseName,
      })),
    ...assignmentEvents.map((a) => ({
      id: a.id,
      title: a.title,
      date: a.dueDate,
      type: 'assignment' as const,
      courseId: a.courseId,
      courseName: a.courseName,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())
}
