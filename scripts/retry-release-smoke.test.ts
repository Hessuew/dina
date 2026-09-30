import { describe, expect, it } from 'vitest'

import { runWithRetry } from './retry-release-smoke'

describe('runWithRetry', () => {
  it('retries transient failures with bounded exponential backoff', async () => {
    const outcomes = [1, 1, 0]
    const delays: Array<number> = []

    const exitCode = await runWithRetry(
      async () => outcomes.shift() ?? 1,
      { baseDelayMs: 5, maxAttempts: 4, maxDelayMs: 20 },
      async (delayMs) => {
        delays.push(delayMs)
      },
    )

    expect(exitCode).toBe(0)
    expect(delays).toEqual([5, 10])
  })

  it('returns the final failure after the retry window is exhausted', async () => {
    let attempts = 0

    const exitCode = await runWithRetry(
      async () => {
        attempts += 1
        return 1
      },
      { baseDelayMs: 5, maxAttempts: 3, maxDelayMs: 20 },
      async () => undefined,
    )

    expect(exitCode).toBe(1)
    expect(attempts).toBe(3)
  })
})
