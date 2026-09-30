import { describe, expect, it, vi } from 'vitest'

import { runRequestWithReleaseMetrics } from './release-request'

describe('runRequestWithReleaseMetrics', () => {
  it('records a synthetic 500 before rethrowing request failures', async () => {
    const writeDataPoint = vi.fn()
    const error = new Error('request failed')
    const request = new Request('https://christ-dina.org/login')

    await expect(
      runRequestWithReleaseMetrics(
        request,
        { RELEASE_METRICS: { writeDataPoint } },
        {
          id: 'version-123',
          tag: 'v2026.09.30.1',
          timestamp: '2026-09-30T00:00:00.000Z',
        },
        performance.now(),
        async () => {
          throw error
        },
      ),
    ).rejects.toBe(error)

    expect(writeDataPoint).toHaveBeenCalledWith({
      indexes: ['version-123'],
      blobs: ['v2026.09.30.1', 'GET', '/login'],
      doubles: [1, 1, expect.any(Number)],
    })
  })
})
