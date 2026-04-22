import { createServerFn } from '@tanstack/react-start'
import { and, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/db'
import { assignments, courses, lessons } from '@/db/schema'

export type SpecialEventCategory = 'exam' | 'chapel' | 'personal'

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

const SPECIAL_EVENTS: Array<CalendarEvent> = [
  {
    id: 'special-1',
    title: 'Chaplain Prayer Hour',
    date: new Date('2026-04-25T09:00:00'),
    type: 'special',
    courseId: '',
    courseName: '',
    description:
      'Weekly prayer hour led by the chaplain. All students welcome.',
    specialCategory: 'chapel',
  },
  {
    id: 'special-2',
    title: 'First Semester Exam',
    date: new Date('2026-05-12T08:00:00'),
    type: 'special',
    courseId: '',
    courseName: '',
    description:
      'Comprehensive first semester examination. Covers all published courses.',
    specialCategory: 'exam',
  },
  {
    id: 'special-3',
    title: 'Personal Reflection & Assignment',
    date: new Date('2026-05-05T10:00:00'),
    type: 'special',
    courseId: '',
    courseName: '',
    description:
      'Scheduled personal reflection time. Submit your reflection journal by end of day.',
    specialCategory: 'personal',
  },
  {
    id: 'special-4',
    title: 'Chaplain Prayer Hour',
    date: new Date('2026-05-16T09:00:00'),
    type: 'special',
    courseId: '',
    courseName: '',
    description:
      'Weekly prayer hour led by the chaplain. All students welcome.',
    specialCategory: 'chapel',
  },
  {
    id: 'special-5',
    title: 'Second Semester Exam',
    date: new Date('2026-06-10T08:00:00'),
    type: 'special',
    courseId: '',
    courseName: '',
    description: 'Comprehensive second semester examination.',
    specialCategory: 'exam',
  },
]

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

    const allEvents = [
      ...lessonEvents,
      ...assignmentEvents,
      ...SPECIAL_EVENTS,
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return { events: allEvents }
  },
)
