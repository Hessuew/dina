import {
  computeClosesAt,
  isAttendanceWindowOpen,
} from './attendance-window.domain'
import { ConflictError, ValidationError } from '@/utils/errors'

export type SessionSnapshot = {
  id: string
  courseId: string
  lessonId: string
  closesAt: Date | null
}

/**
 * Another open session on the same course blocks starting/re-opening a
 * different lesson. Re-opening the *same* open session is a no-op at domain
 * level (service treats it as already open).
 */
export function assertCanOpenSession(args: {
  now: Date
  courseId: string
  lessonId: string
  openOnCourse: SessionSnapshot | null
}): void {
  const { now, courseId, lessonId, openOnCourse } = args
  if (!openOnCourse) return
  if (!isAttendanceWindowOpen(now, openOnCourse.closesAt)) return
  if (openOnCourse.courseId !== courseId) return
  if (openOnCourse.lessonId === lessonId) {
    throw new ConflictError('Attendance is already open for this lesson')
  }
  throw new ConflictError(
    'Another attendance window is already open on this course',
  )
}

export function assertCanMarkPresent(args: {
  now: Date
  closesAt: Date | null | undefined
}): void {
  if (!isAttendanceWindowOpen(args.now, args.closesAt)) {
    throw new ValidationError('Attendance window is closed')
  }
}

export function buildOpenWindow(now: Date): {
  openedAt: Date
  closesAt: Date
} {
  return {
    openedAt: now,
    closesAt: computeClosesAt(now),
  }
}

export function buildManualClose(now: Date): { closesAt: Date } {
  return { closesAt: now }
}

/** Closed session stamp for teacher/admin Present override (no live window). */
export function buildClosedOverrideSession(now: Date): {
  openedAt: Date
  closesAt: Date
} {
  return { openedAt: now, closesAt: now }
}
