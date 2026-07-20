import type { CourseAttendanceScore } from '@/types/student'

export type { CourseAttendanceScore }

export type LessonRef = {
  id: string
  title: string
  orderIndex: number
  courseId: string
}

export type PresentRef = {
  lessonId: string
  studentId: string
}

/**
 * Denominator = all lessons for the course (including drafts).
 * Numerator = present marks for that student on sessions for those lessons.
 */
export function buildCourseAttendanceScores(
  courses: Array<{ id: string; title: string }>,
  lessons: Array<LessonRef>,
  presents: Array<PresentRef>,
  studentId: string,
): Array<CourseAttendanceScore> {
  const presentLessonIds = new Set(
    presents.filter((p) => p.studentId === studentId).map((p) => p.lessonId),
  )

  return courses.map((course) => {
    const courseLessons = lessons
      .filter((l) => l.courseId === course.id)
      .slice()
      .sort(
        (a, b) => a.orderIndex - b.orderIndex || a.title.localeCompare(b.title),
      )

    const lessonRows = courseLessons.map((lesson) => ({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      orderIndex: lesson.orderIndex,
      present: presentLessonIds.has(lesson.id),
    }))

    return {
      courseId: course.id,
      courseTitle: course.title,
      present: lessonRows.filter((l) => l.present).length,
      totalLessons: lessonRows.length,
      lessons: lessonRows,
    }
  })
}

export function formatAttendanceScore(present: number, total: number): string {
  return `${present}/${total}`
}

/** Attach canManageAttendance from a set of course IDs the actor manages. */
export function withAttendanceManageFlags(
  scores: Array<CourseAttendanceScore>,
  manageableCourseIds: ReadonlySet<string>,
): Array<CourseAttendanceScore> {
  return scores.map((score) => ({
    ...score,
    canManageAttendance: manageableCourseIds.has(score.courseId),
  }))
}

/** Optimistic / confirmed Present flip for one lesson under one course. */
export function setLessonPresentOnScores(
  scores: Array<CourseAttendanceScore>,
  courseId: string,
  lessonId: string,
  present: boolean,
): Array<CourseAttendanceScore> {
  return scores.map((score) => {
    if (score.courseId !== courseId) return score
    const lessons = score.lessons.map((lesson) =>
      lesson.lessonId === lessonId ? { ...lesson, present } : lesson,
    )
    return {
      ...score,
      lessons,
      present: lessons.filter((l) => l.present).length,
    }
  })
}
