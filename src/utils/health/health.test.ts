import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  handleHealthRequest,
  handleReadinessRequest,
  isOperationalPath,
} from './health'
import type { HealthPayload, ReadinessPayload } from './health'

describe('operational health endpoints', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('identifies the worker-level operational paths', () => {
    expect(isOperationalPath('/healthz')).toBe(true)
    expect(isOperationalPath('/readyz')).toBe(true)
    expect(isOperationalPath('/login')).toBe(false)
  })

  it('returns a lightweight health response without dependency checks', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const checkDatabase = vi.fn()

    const response = handleHealthRequest(request('/healthz'), {
      checkDatabase,
      environment: 'test',
      requestId: 'req-1',
      release: 'abc123',
    })
    const body = await readJson<HealthPayload>(response)

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(checkDatabase).not.toHaveBeenCalled()
    expect(body).toMatchObject({
      status: 'ok',
      service: 'christ-dina',
      environment: 'test',
      release: 'abc123',
      requestId: 'req-1',
    })
    expect(JSON.parse(info.mock.calls[0][0])).toMatchObject({
      level: 'info',
      event: 'health_check',
      requestId: 'req-1',
      path: '/healthz',
      status: 'ok',
    })
  })

  it('returns a ready response when the database check succeeds', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})

    const response = await handleReadinessRequest(request('/readyz'), {
      checkDatabase: vi.fn().mockResolvedValue(undefined),
      environment: 'test',
      requestId: 'req-2',
    })
    const body = await readJson<ReadinessPayload>(response)

    expect(response.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.dependencies.database.status).toBe('ok')
    expect(info).toHaveBeenCalledOnce()
  })

  it('returns a redacted not-ready response when the database check fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const response = await handleReadinessRequest(request('/readyz'), {
      checkDatabase: vi
        .fn()
        .mockRejectedValue(new Error('secret postgres://user:pass@example')),
      environment: 'test',
      requestId: 'req-3',
    })
    const bodyText = await response.text()
    const body = JSON.parse(bodyText)

    expect(response.status).toBe(503)
    expect(body.status).toBe('error')
    expect(body.dependencies.database.error).toEqual({
      category: 'database_unavailable',
      message: 'Database readiness check failed',
    })
    expect(bodyText).not.toContain('postgres://')
    expect(warn.mock.calls[0][0]).not.toContain('postgres://')
    expect(JSON.parse(warn.mock.calls[0][0])).toMatchObject({
      level: 'warn',
      event: 'readiness_check',
      errorCategory: 'database_unavailable',
    })
  })
})

function request(pathname: string): Request {
  return new Request(`https://christ-dina.org${pathname}`)
}

async function readJson<T>(response: Response): Promise<T> {
  const parsed: unknown = JSON.parse(await response.text())
  return parsed as T
}
