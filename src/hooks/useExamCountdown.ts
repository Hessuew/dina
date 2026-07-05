import * as React from 'react'
import { remainingMs } from '@/utils/exam/domain/exam-timing.domain'

/**
 * Server-anchored countdown: clock skew is computed once from the
 * server-provided `serverNow`, so a wrong client clock cannot stretch or
 * shrink the visible time. The server remains the enforcement authority.
 */
export function useExamCountdown(deadlineAt: Date, serverNow: Date) {
  const [skew] = React.useState(() => serverNow.getTime() - Date.now())
  const compute = React.useCallback(
    () => remainingMs(new Date(Date.now() + skew), deadlineAt),
    [skew, deadlineAt],
  )
  const [msLeft, setMsLeft] = React.useState(compute)

  React.useEffect(() => {
    if (msLeft <= 0) return
    const interval = setInterval(() => setMsLeft(compute()), 1000)
    return () => clearInterval(interval)
  }, [compute, msLeft <= 0])

  return { remainingMs: msLeft, isExpired: msLeft <= 0 }
}
