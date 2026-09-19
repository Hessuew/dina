export type CourseAttendanceLesson = {
  id: string
  title: string
  orderIndex: number
  courseId: string
  isPublished: boolean | null
}

export type CourseAttendanceSession = {
  id: string
  lessonId: string
  closesAt: Date | null
}

export function mergeCourseLessonsWithSessions(
  lessons: Array<CourseAttendanceLesson>,
  sessions: Array<CourseAttendanceSession>,
) {
  const sessionByLessonId = new Map(
    sessions.map((session) => [session.lessonId, session]),
  )

  return lessons.map((lesson) => {
    const session = sessionByLessonId.get(lesson.id)
    return {
      ...lesson,
      sessionId: session?.id ?? null,
      closesAt: session?.closesAt ?? null,
    }
  })
}
