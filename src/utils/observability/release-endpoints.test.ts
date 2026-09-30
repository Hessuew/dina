import { afterEach, describe, expect, it, vi } from 'vitest'

import { handleReleaseEndpoint, recordReleaseMetric } from './release-endpoints'
import type { ReleaseRuntimeEnv } from './release-endpoints'

const metadata = {
  id: 'version-1',
  tag: 'v2026.09.30.1',
  timestamp: '2026-09-30T00:00:00.000Z',
}

const runtime: ReleaseRuntimeEnv = {
  RELEASE_METRICS_TOKEN: 'secret',
  CLOUDFLARE_ACCOUNT_ID: 'account',
  CLOUDFLARE_ANALYTICS_TOKEN: 'analytics',
}

describe('release metrics endpoint', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('fails closed when the provider high-severity signal is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [{ requests: 1, errors: 0, p95LatencyMs: 10 }],
            }),
          ),
      ),
    )

    const response = await handleReleaseEndpoint(
      new Request(
        'https://example.test/_internal/release/metrics?version_id=version-1&since=2026-09-30T12:34:56.000Z&until=2026-09-30T12:35:56.000Z',
        { headers: { authorization: 'Bearer secret' } },
      ),
      runtime,
      metadata,
    )

    expect(response?.status).toBe(503)
  })

  it('echoes the normalized metrics window with queryable metrics', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              data: [
                {
                  requests: 20,
                  errors: 0,
                  p95LatencyMs: 10,
                  highSeverityIssues: 0,
                },
              ],
            }),
          ),
      ),
    )

    const response = await handleReleaseEndpoint(
      new Request(
        'https://example.test/_internal/release/metrics?version_id=version-1&since=2026-09-30T12:34:56.000Z&until=2026-09-30T12:39:56.000Z',
        { headers: { authorization: 'Bearer secret' } },
      ),
      runtime,
      metadata,
    )

    expect(response?.status).toBe(200)
    await expect(response?.json()).resolves.toEqual({
      requests: 20,
      errors: 0,
      p95LatencyMs: 10,
      highSeverityIssues: 0,
      since: '2026-09-30T12:34:56.000Z',
      until: '2026-09-30T12:39:56.000Z',
    })
  })

  it('records an ordinary 5xx only in the error-rate metric', () => {
    const writeDataPoint = vi.fn()
    const request = new Request('https://example.test/orders', {
      method: 'GET',
    })

    recordReleaseMetric(
      { RELEASE_METRICS: { writeDataPoint } },
      metadata,
      request,
      new Response(null, { status: 500 }),
      42,
    )

    expect(writeDataPoint).toHaveBeenCalledWith({
      indexes: ['version-1'],
      blobs: ['v2026.09.30.1', 'GET', '/orders'],
      doubles: [1, 1, 42],
    })
  })
})
