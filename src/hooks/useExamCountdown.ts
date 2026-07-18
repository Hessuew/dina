import { useServerCountdown } from '@/hooks/useServerCountdown'

/**
 * Exam-facing alias for the shared server-anchored countdown.
 * Prefer `useServerCountdown` for new call sites.
 */
export function useExamCountdown(deadlineAt: Date, serverNow: Date) {
  return useServerCountdown(deadlineAt, serverNow)
}
