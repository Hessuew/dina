import * as React from 'react'
import {
  computeClockSkew,
  remainingWithSkew,
} from './domain/server-countdown.domain'

function toMs(value: Date | string | number): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return new Date(value).getTime()
  return value.getTime()
}

/**
 * Server-anchored countdown: skew recomputes when `deadlineAt` or
 * `serverNow` change (poll / re-open). Server remains enforcement authority.
 */
export function useServerCountdown(
  deadlineAt: Date | string | number,
  serverNow: Date | string | number,
) {
  const deadlineMs = toMs(deadlineAt)
  const serverNowMs = toMs(serverNow)
  const anchorKey = `${deadlineMs}:${serverNowMs}`
  const [skew] = React.useState(() =>
    computeClockSkew(serverNowMs, Date.now()),
  )
  const [activeSkew, setActiveSkew] = React.useState(skew)
  const prevKeyRef = React.useRef(anchorKey)

  React.useEffect(() => {
    if (prevKeyRef.current === anchorKey) return
    prevKeyRef.current = anchorKey
    setActiveSkew(computeClockSkew(serverNowMs, Date.now()))
  }, [anchorKey, serverNowMs])

  const compute = React.useCallback(
    () => remainingWithSkew(Date.now(), activeSkew, deadlineMs),
    [activeSkew, deadlineMs],
  )
  const [msLeft, setMsLeft] = React.useState(compute)

  React.useEffect(() => {
    setMsLeft(compute())
  }, [compute])

  React.useEffect(() => {
    if (msLeft <= 0) return
    const interval = setInterval(() => setMsLeft(compute()), 1000)
    return () => clearInterval(interval)
  }, [compute, msLeft <= 0])

  return { remainingMs: msLeft, isExpired: msLeft <= 0 }
}
