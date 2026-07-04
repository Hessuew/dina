/** Late saves within this grace window after the deadline are still accepted. */
export const SAVE_GRACE_MS = 30_000

const MS_PER_MINUTE = 60_000

/** Server-authoritative attempt deadline: start + duration. */
export function computeDeadline(startedAt: Date, durationMinutes: number): Date {
  return new Date(startedAt.getTime() + durationMinutes * MS_PER_MINUTE)
}

/**
 * Whether a student may START an attempt now. Starting is only allowed inside
 * [opensAt, closesAt]; a started attempt always gets its full duration even
 * past closesAt.
 */
export function isWithinStartWindow(
  now: Date,
  opensAt: Date,
  closesAt: Date,
): boolean {
  return now.getTime() >= opensAt.getTime() && now.getTime() <= closesAt.getTime()
}

/** Whether an answer save / submit is still accepted (deadline + grace). */
export function isSaveAllowed(
  now: Date,
  deadlineAt: Date,
  graceMs: number = SAVE_GRACE_MS,
): boolean {
  return now.getTime() <= deadlineAt.getTime() + graceMs
}

/** Whether an in-progress attempt should be finalized as expired. */
export function isAttemptExpired(
  now: Date,
  deadlineAt: Date,
  graceMs: number = SAVE_GRACE_MS,
): boolean {
  return !isSaveAllowed(now, deadlineAt, graceMs)
}

/** Milliseconds until the deadline, clamped to zero. */
export function remainingMs(now: Date, deadlineAt: Date): number {
  return Math.max(0, deadlineAt.getTime() - now.getTime())
}

/** Formats remaining time as m:ss (e.g. 29:07, 0:09). */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
