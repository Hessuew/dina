/** Hard-coded open window for self check-in (plan decision). */
export const ATTENDANCE_WINDOW_MINUTES = 10

const MS_PER_MINUTE = 60_000

export function computeClosesAt(
  openedAt: Date,
  durationMinutes: number = ATTENDANCE_WINDOW_MINUTES,
): Date {
  return new Date(openedAt.getTime() + durationMinutes * MS_PER_MINUTE)
}

/** Window is open when closesAt is set and still in the future. */
export function isAttendanceWindowOpen(
  now: Date,
  closesAt: Date | null | undefined,
): boolean {
  if (!closesAt) return false
  return now.getTime() < closesAt.getTime()
}

export function remainingMs(now: Date, closesAt: Date): number {
  return Math.max(0, closesAt.getTime() - now.getTime())
}

/** Formats remaining time as m:ss (e.g. 9:07, 0:09). */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
