import { createServerFn } from '@tanstack/react-start'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/db'
import { assignments, courses, lessons } from '@/db/schema'

export type CalendarEvent = {
  id: string
  title: string
  date: Date
  type: 'lesson' | 'assignment'
  courseId: string
  courseName: string
  description?: string | null
  duration?: number | null
  maxGrade?: number | null
}

export const getCalendarEvents = createServerFn({ method: 'GET' }).handler(
  async () => {
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

    const allEvents = [...lessonEvents, ...assignmentEvents].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    return { events: allEvents }
  },
)
