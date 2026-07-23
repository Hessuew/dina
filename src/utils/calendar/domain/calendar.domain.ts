import { isAfter } from 'date-fns'
import type { calendarEventCategoryEnum } from '@/db/schema'

type CalendarEventCategory =
  (typeof calendarEventCategoryEnum.enumValues)[number]

export type SpecialEventCategory = CalendarEventCategory | 'other'

export type CalendarEvent = {
  id: string
  title: string
  date: Date
  type: 'lesson' | 'assignment' | 'special'
  courseId: string
  courseName: string
  description?: string | null
  endDate?: Date | null
  location?: string | null
  zoomLink?: string | null
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
  endTime: Date | null
  courseId: string | null
  description: string | null
  location: string | null
  zoomLink: string | null
  category: CalendarEventCategory | null
}

export function buildCalendarEvents(
  lessons: Array<LessonRow>,
  assignments: Array<AssignmentRow>,
  specialEvents: Array<SpecialEventRow>,
): Array<CalendarEvent> {
  const lessonEvents = lessons
    .filter(
      (l): l is LessonRow & { scheduledTime: Date } => l.scheduledTime !== null,
    )
    .map(
      (lesson): CalendarEvent => ({
        id: lesson.id,
        title: lesson.title,
        date: lesson.scheduledTime,
        type: 'lesson',
        courseId: lesson.courseId,
        courseName: lesson.courseName,
        description: lesson.content,
        duration: lesson.duration,
      }),
    )

  const assignmentEvents = assignments.map(
    (assignment): CalendarEvent => ({
      id: assignment.id,
      title: assignment.title,
      date: assignment.dueDate,
      type: 'assignment',
      courseId: assignment.courseId,
      courseName: assignment.courseName,
      description: assignment.description,
      maxGrade: assignment.maxGrade,
    }),
  )

  const specialCalendarEvents = specialEvents.map(
    (e): CalendarEvent => ({
      id: e.id,
      title: e.title,
      date: e.startTime,
      type: 'special',
      courseId: e.courseId ?? '',
      courseName: '',
      description: e.description,
      endDate: e.endTime,
      location: e.location,
      zoomLink: e.zoomLink,
      specialCategory: e.category ?? undefined,
    }),
  )

  return [...lessonEvents, ...assignmentEvents, ...specialCalendarEvents].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  )
}

export type CalendarCourse = { id: string; name: string }

export function parseCalendarMonth(
  month: string | undefined,
  fallback: Date = new Date(),
): Date {
  if (!month) return fallback
  const parsed = new Date(month)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

export function deriveCalendarCourses(
  events: Array<CalendarEvent>,
): Array<CalendarCourse> {
  return Array.from(
    new Map(
      events
        .filter((e) => e.courseId)
        .map((e) => [e.courseId, { id: e.courseId, name: e.courseName }]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name))
}

export function filterCalendarEvents(
  events: Array<CalendarEvent>,
  selectedCourse: string,
  selectedType: string,
): Array<CalendarEvent> {
  return events.filter((event) => {
    const courseMatch =
      selectedCourse === 'all' || event.courseId === selectedCourse
    const typeMatch =
      selectedType === 'all' ||
      event.type === selectedType ||
      (selectedType === 'lesson' && event.specialCategory === 'lesson')
    return courseMatch && typeMatch
  })
}

export function deriveUpcomingSpecials(
  events: Array<CalendarEvent>,
  now: Date = new Date(),
): Array<CalendarEvent> {
  return events
    .filter(
      (e) =>
        e.type === 'special' &&
        e.specialCategory !== 'lesson' &&
        isAfter(new Date(e.date), now),
    )
    .slice(0, 3)
}

export function deriveUpcomingEvents(
  events: Array<CalendarEvent>,
  now: Date = new Date(),
): Array<CalendarEvent> {
  return events.filter((e) => isAfter(new Date(e.date), now)).slice(0, 5)
}
