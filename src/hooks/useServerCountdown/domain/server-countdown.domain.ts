/** Clock skew: positive when server is ahead of client. */
export function computeClockSkew(
  serverNowMs: number,
  clientNowMs: number,
): number {
  return serverNowMs - clientNowMs
}

/** Remaining ms using a fixed skew offset from the client clock. */
export function remainingWithSkew(
  clientNowMs: number,
  skewMs: number,
  deadlineAtMs: number,
): number {
  const adjustedNow = clientNowMs + skewMs
  return Math.max(0, deadlineAtMs - adjustedNow)
}
