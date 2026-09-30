import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  handleReleaseEndpoint,
  type ReleaseRuntimeEnv,
} from './release-endpoints'

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

  it('formats UTC timestamps for Analytics Engine SQL', async () => {
    const fetchMock = vi.fn(async (...args: Parameters<typeof fetch>) => {
      const [, init] = args
      const query = String(init?.body)
      expect(query).toContain("toDateTime('2026-09-30 12:34:56')")
      expect(query).toContain("toDateTime('2026-09-30 12:35:56')")
      return new Response(
        JSON.stringify({
          data: [
            {
              requests: 1,
              errors: 0,
              p95LatencyMs: 10,
              highSeverityIssues: 0,
            },
          ],
        }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const response = await handleReleaseEndpoint(
      new Request(
        'https://example.test/_internal/release/metrics?version_id=version-1&since=2026-09-30T12:34:56.000Z&until=2026-09-30T12:35:56.000Z',
        { headers: { authorization: 'Bearer secret' } },
      ),
      runtime,
      metadata,
    )

    expect(response?.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
