export type SpecialEventCategory = 'exam' | 'chapel' | 'personal' | 'other'

export type CalendarEvent = {
  id: string
  title: string
  date: Date
  type: 'lesson' | 'assignment' | 'special'
  courseId: string
  courseName: string
  description?: string | null
  duration?: number | null
  maxGrade?: number | null
  specialCategory?: SpecialEventCategory
}

type LessonRow = {
  id: string
  title: string
  scheduledTime: Date | null
  courseId: string
  courseName: string
  content: string | null
  duration: number | null
}

type AssignmentRow = {
  id: string
  title: string
  dueDate: Date
  courseId: string
  courseName: string
  description: string | null
  maxGrade: number | null
}

type SpecialEventRow = {
  id: string
  title: string
  startTime: Date
  courseId: string | null
  description: string | null
  category: 'exam' | 'chapel' | 'personal' | null
}

export function buildCalendarEvents(
  lessons: Array<LessonRow>,
  assignments: Array<AssignmentRow>,
  specialEvents: Array<SpecialEventRow>,
): Array<CalendarEvent> {
  const lessonEvents = lessons
    .filter((l): l is LessonRow & { scheduledTime: Date } => l.scheduledTime !== null)
    .map((lesson): CalendarEvent => ({
      id: lesson.id,
      title: lesson.title,
      date: lesson.scheduledTime,
      type: 'lesson',
      courseId: lesson.courseId,
      courseName: lesson.courseName,
      description: lesson.content,
      duration: lesson.duration,
    }))

  const assignmentEvents = assignments.map((assignment): CalendarEvent => ({
    id: assignment.id,
    title: assignment.title,
    date: assignment.dueDate,
    type: 'assignment',
    courseId: assignment.courseId,
    courseName: assignment.courseName,
    description: assignment.description,
    maxGrade: assignment.maxGrade,
  }))

  const specialCalendarEvents = specialEvents.map((e): CalendarEvent => ({
    id: e.id,
    title: e.title,
    date: e.startTime,
    type: 'special',
    courseId: e.courseId ?? '',
    courseName: '',
    description: e.description,
    specialCategory: e.category ?? undefined,
  }))

  return [...lessonEvents, ...assignmentEvents, ...specialCalendarEvents].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  )
}
