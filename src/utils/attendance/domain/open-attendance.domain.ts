export type OpenAttendanceSession = {
  id: string
  courseId: string
  lessonId: string
  openedAt: Date | null
  closesAt: Date | null
}

export function buildOpenAttendanceRows(
  sessions: Array<OpenAttendanceSession>,
  courses: Array<{ id: string; title: string }>,
  lessons: Array<{ id: string; title: string }>,
  presents: Array<{ id: string; sessionId: string }>,
) {
  const courseById = new Map(courses.map((course) => [course.id, course]))
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const presentIdBySessionId = new Map(
    presents.map((present) => [present.sessionId, present.id]),
  )

  return sessions.flatMap((session) => {
    const course = courseById.get(session.courseId)
    const lesson = lessonById.get(session.lessonId)
    if (!course || !lesson) return []
    return [
      {
        ...session,
        courseTitle: course.title,
        lessonTitle: lesson.title,
        presentId: presentIdBySessionId.get(session.id) ?? null,
      },
    ]
  })
}
