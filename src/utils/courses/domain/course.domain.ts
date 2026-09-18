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
}
type AssignmentEventRow = {
  id: string
  title: string
  dueDate: Date
  lessonId: string
}

type CourseEventRow = { id: string; title: string }
type UpcomingLessonRow = {
  id: string
  title: string
  scheduledTime: Date | null
  thumbnailUrl: string | null
  courseId: string
}
type UpcomingCourseRow = {
  id: string
  title: string
  isPublished: boolean | null
}

export type UpcomingLesson = {
  id: string
  title: string
  scheduledTime: Date
  thumbnailUrl: string | null
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
  courses: Array<CourseEventRow>,
): Array<CourseCalendarEvent> {
  const coursesById = new Map(courses.map((course) => [course.id, course]))
  const lessonsById = new Map(lessonEvents.map((lesson) => [lesson.id, lesson]))

  return [
    ...lessonEvents
      .filter(
        (l): l is LessonEventRow & { scheduledTime: Date } =>
          l.scheduledTime !== null && coursesById.has(l.courseId),
      )
      .map((l) => ({
        id: l.id,
        title: l.title,
        date: l.scheduledTime,
        type: 'lesson' as const,
        courseId: l.courseId,
        courseName: coursesById.get(l.courseId)!.title,
      })),
    ...assignmentEvents.flatMap((a) => {
      const lesson = lessonsById.get(a.lessonId)
      const course = lesson ? coursesById.get(lesson.courseId) : undefined
      if (!lesson || !course) return []
      return [
        {
          id: a.id,
          title: a.title,
          date: a.dueDate,
          type: 'assignment' as const,
          courseId: lesson.courseId,
          courseName: course.title,
        },
      ]
    }),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())
}

export function buildUpcomingLessons(
  lessons: Array<UpcomingLessonRow>,
  courses: Array<UpcomingCourseRow>,
): Array<UpcomingLesson> {
  const courseNames = new Map(
    courses
      .filter((course) => course.isPublished === true)
      .map((course) => [course.id, course.title]),
  )

  return lessons
    .flatMap((lesson) => {
      const courseName = courseNames.get(lesson.courseId)
      if (courseName === undefined || !lesson.scheduledTime) return []
      return [{ ...lesson, scheduledTime: lesson.scheduledTime, courseName }]
    })
    .slice(0, 5)
}
