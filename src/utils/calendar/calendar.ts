import { createServerFn } from '@tanstack/react-start'
import { and, eq, isNotNull } from 'drizzle-orm'
import { getDb } from '@/db'
import { assignments, calendarEvents, courses, lessons } from '@/db/schema'

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

export const getCalendarEvents = createServerFn({ method: 'POST' }).handler(
  async () => {
    const db = await getDb()
    const publishedLessons = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        scheduledTime: lessons.scheduledTime,
        courseId: lessons.courseId,
        courseName: courses.title,
        content: lessons.content,
        duration: lessons.duration,
      })
      .from(lessons)
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(
        and(eq(lessons.isPublished, true), isNotNull(lessons.scheduledTime)),
      )

    const publishedAssignments = await db
      .select({
        id: assignments.id,
        title: assignments.title,
        dueDate: assignments.dueDate,
        lessonId: assignments.lessonId,
        courseId: lessons.courseId,
        courseName: courses.title,
        description: assignments.description,
        maxGrade: assignments.maxGrade,
      })
      .from(assignments)
      .innerJoin(lessons, eq(assignments.lessonId, lessons.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(eq(assignments.status, 'published'))

    const lessonEvents: Array<CalendarEvent> = publishedLessons.map(
      (lesson) => ({
        id: lesson.id,
        title: lesson.title,
        date: lesson.scheduledTime!,
        type: 'lesson' as const,
        courseId: lesson.courseId,
        courseName: lesson.courseName,
        description: lesson.content,
        duration: lesson.duration,
      }),
    )

    const assignmentEvents: Array<CalendarEvent> = publishedAssignments.map(
      (assignment) => ({
        id: assignment.id,
        title: assignment.title,
        date: assignment.dueDate,
        type: 'assignment' as const,
        courseId: assignment.courseId,
        courseName: assignment.courseName,
        description: assignment.description,
        maxGrade: assignment.maxGrade,
      }),
    )

    const dbSpecialEvents = await db.select().from(calendarEvents)

    const specialEvents: Array<CalendarEvent> = dbSpecialEvents.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.startTime,
      type: 'special' as const,
      courseId: e.courseId ?? '',
      courseName: '',
      description: e.description,
      specialCategory: e.category ?? undefined,
    }))

    const allEvents = [
      ...lessonEvents,
      ...assignmentEvents,
      ...specialEvents,
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return { events: allEvents }
  },
)
