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
}

const evidenceRuntime: ReleaseRuntimeEnv = {
  RELEASE_EVIDENCE_TOKEN: 'secret',
  RELEASE_SHA: 'a'.repeat(40),
  RELEASE_ORIGIN: 'https://christ-dina.org',
  RELEASE_SOURCE_MAPS_VERIFIED: 'true',
  RELEASE_ALERTS_SLACK_INCIDENTS: 'true',
  RELEASE_ALERTS_EMAIL_FALLBACK: 'true',
  BETTER_STACK_TELEMETRY_TOKEN: 'telemetry-token',
  BETTER_STACK_APPLICATION_ID: 'app-1',
}

const evidenceQuery = new URLSearchParams({
  release_tag: metadata.tag,
  target_sha: 'a'.repeat(40),
  cloudflare_version_id: metadata.id,
  origin: 'https://christ-dina.org',
})

function evidenceRequest(
  overrides: { query?: Record<string, string>; token?: string } = {},
): Request {
  const query = new URLSearchParams(evidenceQuery)
  for (const [key, value] of Object.entries(overrides.query ?? {})) {
    if (value === '') query.delete(key)
    else query.set(key, value)
  }
  const token = overrides.token ?? 'secret'
  return new Request(
    `https://example.test/_internal/release/evidence?${query.toString()}`,
    token === ''
      ? undefined
      : { headers: { authorization: `Bearer ${token}` } },
  )
}

function reportedRelease(overrides: Record<string, unknown> = {}) {
  return {
    attributes: {
      version: metadata.tag,
      application_id: 'app-1',
      environments: ['production'],
      origin: 'reported',
      ...overrides,
    },
  }
}

describe('release metrics endpoint', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('stays non-queryable until an external severity adapter supplies metrics', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const response = await handleReleaseEndpoint(
      new Request(
        'https://example.test/_internal/release/metrics?version_id=version-1&since=2026-09-30T12:34:56.000Z&until=2026-09-30T12:35:56.000Z',
        { headers: { authorization: 'Bearer secret' } },
      ),
      runtime,
      metadata,
    )

    expect(response?.status).toBe(503)
    expect(fetchSpy).not.toHaveBeenCalled()
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

describe('release evidence endpoint', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('rejects unauthenticated requests before exposing identity details', async () => {
    for (const request of [
      evidenceRequest({ token: '' }),
      evidenceRequest({ token: 'wrong' }),
    ]) {
      const response = await handleReleaseEndpoint(
        request,
        evidenceRuntime,
        metadata,
      )

      expect(response?.status).toBe(401)
    }
  })

  it('rejects an incomplete release identity', async () => {
    const response = await handleReleaseEndpoint(
      evidenceRequest({ query: { target_sha: '' } }),
      evidenceRuntime,
      metadata,
    )

    expect(response?.status).toBe(400)
  })

  it('rejects identity that does not match the deployed Worker version', async () => {
    const wrongVersion = await handleReleaseEndpoint(
      evidenceRequest({ query: { cloudflare_version_id: 'version-2' } }),
      evidenceRuntime,
      metadata,
    )
    const wrongTag = await handleReleaseEndpoint(
      evidenceRequest({ query: { release_tag: 'v2026.09.30.2' } }),
      evidenceRuntime,
      metadata,
    )
    const missingMetadata = await handleReleaseEndpoint(
      evidenceRequest(),
      evidenceRuntime,
      null,
    )

    expect(wrongVersion?.status).toBe(409)
    expect(wrongTag?.status).toBe(409)
    expect(missingMetadata?.status).toBe(409)
  })

  it('rejects identity that does not match the injected build identity', async () => {
    const wrongSha = await handleReleaseEndpoint(
      evidenceRequest({ query: { target_sha: 'b'.repeat(40) } }),
      evidenceRuntime,
      metadata,
    )
    const wrongOrigin = await handleReleaseEndpoint(
      evidenceRequest({ query: { origin: 'https://attacker.example' } }),
      evidenceRuntime,
      metadata,
    )

    expect(wrongSha?.status).toBe(409)
    expect(wrongOrigin?.status).toBe(409)
  })

  it('fails closed when the release is not registered with the provider', async () => {
    for (const body of [
      { data: [] },
      { data: [reportedRelease({ version: 'v2026.09.30.2' })] },
      { data: [reportedRelease({ origin: 'reported_by_user' })] },
      { data: [reportedRelease({ environments: ['staging'] })] },
      { unexpected: 'shape' },
    ]) {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(JSON.stringify(body), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
        ),
      )

      const response = await handleReleaseEndpoint(
        evidenceRequest(),
        evidenceRuntime,
        metadata,
      )

      expect(response?.status).toBe(503)
      vi.unstubAllGlobals()
    }
  })

  it('fails closed when the telemetry token or application id is missing', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    for (const partial of [
      { BETTER_STACK_TELEMETRY_TOKEN: undefined },
      { BETTER_STACK_APPLICATION_ID: undefined },
    ]) {
      const response = await handleReleaseEndpoint(
        evidenceRequest(),
        { ...evidenceRuntime, ...partial },
        metadata,
      )

      expect(response?.status).toBe(503)
    }
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('returns verified release evidence with readiness flags', async () => {
    const fetchSpy = vi.fn(
      async (url: unknown, init?: { headers?: Record<string, string> }) => {
        const requestUrl = new URL(String(url))
        expect(requestUrl.origin).toBe('https://errors.betterstack.com')
        expect(requestUrl.searchParams.get('application_id')).toBe('app-1')
        expect(requestUrl.searchParams.get('version')).toBe(metadata.tag)
        expect(requestUrl.searchParams.get('environment')).toBe('production')
        expect(init?.headers?.authorization).toBe('Bearer telemetry-token')
        return new Response(JSON.stringify({ data: [reportedRelease()] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
    )
    vi.stubGlobal('fetch', fetchSpy)

    const response = await handleReleaseEndpoint(
      evidenceRequest(),
      evidenceRuntime,
      metadata,
    )

    expect(response?.status).toBe(200)
    await expect(response?.json()).resolves.toEqual({
      releaseTag: metadata.tag,
      targetSha: 'a'.repeat(40),
      cloudflareVersionId: metadata.id,
      origin: 'https://christ-dina.org',
      sourceMapsCorrelated: true,
      alerts: { slackIncidents: true, emailFallback: true },
    })
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('reports readiness flags as false until verified', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ data: [reportedRelease()] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )

    const response = await handleReleaseEndpoint(
      evidenceRequest(),
      {
        ...evidenceRuntime,
        RELEASE_SOURCE_MAPS_VERIFIED: 'false',
        RELEASE_ALERTS_SLACK_INCIDENTS: 'false',
        RELEASE_ALERTS_EMAIL_FALLBACK: 'false',
      },
      metadata,
    )

    await expect(response?.json()).resolves.toMatchObject({
      sourceMapsCorrelated: false,
      alerts: { slackIncidents: false, emailFallback: false },
    })
  })
})
