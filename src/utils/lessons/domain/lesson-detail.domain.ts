export function resolveLessonPublished(isPublished: boolean | null): boolean {
  return isPublished ?? false
}

export function shouldShowLessonContent(
  isPublished: boolean,
  canEdit: boolean,
): boolean {
  return isPublished || canEdit
}

export function getLessonStatus(isPublished: boolean): 'published' | 'draft' {
  return isPublished ? 'published' : 'draft'
}

export function handleDialogDismiss(
  open: boolean,
  onDismiss: () => void,
): void {
  if (!open) onDismiss()
}

export function resolveDeleteErrorMessage(error: unknown): string {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? (error as { message?: unknown }).message
      : undefined
  return typeof message === 'string' && message
    ? message
    : 'Failed to check submissions'
}

export type LessonBackSearch = {
  fromCalendar?: boolean
  calendarMonth?: string
}

export type LessonBackNavigation =
  | { kind: 'calendar'; month: string }
  | { kind: 'course'; courseId: string }

export function buildLessonBackNavigation(
  search: LessonBackSearch,
  courseId: string,
): LessonBackNavigation {
  if (search.fromCalendar && search.calendarMonth) {
    return { kind: 'calendar', month: search.calendarMonth }
  }
  return { kind: 'course', courseId }
}

export function formatLessonSchedule(
  scheduledTime: Date | string | number | null | undefined,
): string | null {
  if (!scheduledTime) return null
  const date = new Date(scheduledTime)
  const day = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${day} at ${time}`
}

type LessonInitialSource = {
  id: string
  title: string
  content: string | null
  scheduledTime: Date | string | null
  duration: number | null
  isPublished: boolean | null
  orderIndex: number
}

export type LessonDialogInitialData = {
  lessonId: string
  title: string
  content: string | null
  scheduledTime: Date | null
  duration: number | null
  isPublished: boolean
  orderIndex: number
}

export function buildLessonDialogInitialData(
  lesson: LessonInitialSource,
): LessonDialogInitialData {
  return {
    lessonId: lesson.id,
    title: lesson.title,
    content: lesson.content,
    scheduledTime: lesson.scheduledTime ? new Date(lesson.scheduledTime) : null,
    duration: lesson.duration,
    isPublished: lesson.isPublished ?? false,
    orderIndex: lesson.orderIndex,
  }
}
