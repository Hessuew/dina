type AssignmentRecord = {
  id: string
  lessonId: string
  dueDate: Date
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

type CourseTeacherRecord = {
  courseId: string
  teacherId: string
}

type SubmissionRecord = {
  assignmentId: string
}

export function buildTeacherAssignmentRows<
  TAssignment extends AssignmentRecord,
  TSubmission extends SubmissionRecord,
>(
  assignments: ReadonlyArray<TAssignment>,
  lessons: ReadonlyArray<LessonRecord>,
  courses: ReadonlyArray<CourseRecord>,
  courseTeachers: ReadonlyArray<CourseTeacherRecord>,
  submissions?: ReadonlyArray<TSubmission>,
) {
  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const coursesById = new Map(courses.map((course) => [course.id, course]))
  const teachersByCourseId = new Map<string, Array<{ teacherId: string }>>()
  const submissionsByAssignmentId = new Map<string, Array<TSubmission>>()

  for (const teacher of courseTeachers) {
    const teachers = teachersByCourseId.get(teacher.courseId) ?? []
    teachers.push({ teacherId: teacher.teacherId })
    teachersByCourseId.set(teacher.courseId, teachers)
  }
  for (const submission of submissions ?? []) {
    const assignmentSubmissions =
      submissionsByAssignmentId.get(submission.assignmentId) ?? []
    assignmentSubmissions.push(submission)
    submissionsByAssignmentId.set(
      submission.assignmentId,
      assignmentSubmissions,
    )
  }

  return assignments
    .flatMap((assignment) => {
      const lesson = lessonsById.get(assignment.lessonId)
      const course = lesson ? coursesById.get(lesson.courseId) : undefined
      if (!lesson || !course) return []

      const row = {
        ...assignment,
        lesson: {
          ...lesson,
          course: {
            ...course,
            courseTeachers: teachersByCourseId.get(course.id) ?? [],
          },
        },
      }
      return submissions
        ? [
            {
              ...row,
              submissions: submissionsByAssignmentId.get(assignment.id) ?? [],
            },
          ]
        : [row]
    })
    .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())
}

export function mergeTeacherCatalogAssignments<
  TAssignment extends AssignmentRecord,
>(
  publishedAssignments: ReadonlyArray<TAssignment>,
  managedAssignments: ReadonlyArray<TAssignment>,
) {
  return Array.from(
    new Map(
      [...publishedAssignments, ...managedAssignments].map((assignment) => [
        assignment.id,
        assignment,
      ]),
    ).values(),
  ).sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime())
}
