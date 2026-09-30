import { describe, expect, it } from 'vitest'

import {
  addWorkerVersionHeaders,
  readWorkerVersionMetadata,
} from './version-headers'

const metadata = {
  id: 'version-123',
  tag: 'v2026.09.30.1',
  timestamp: '2026-09-30T00:00:00.000Z',
}

describe('worker version headers', () => {
  it('preserves immutable redirect responses while adding release headers', async () => {
    const redirect = Response.redirect('https://example.com/login', 307)

    const response = addWorkerVersionHeaders(
      redirect,
      { WORKER_VERSION: metadata },
      new Request('https://christ-dina.org/login'),
    )

    expect(response.status).toBe(307)
    expect(response.statusText).toBe(redirect.statusText)
    expect(response.headers.get('location')).toBe('https://example.com/login')
    expect(response.headers.get('x-dina-worker-version')).toBe('version-123')
    expect(response.headers.get('x-dina-worker-version-tag')).toBe(
      'v2026.09.30.1',
    )
    expect(response.headers.get('set-cookie')).toMatch(/dina-version-key=/u)
    expect(() => response.headers.set('x-test', 'mutable')).not.toThrow()

    const bodyResponse = addWorkerVersionHeaders(
      new Response('body', {
        headers: { 'x-existing': 'value' },
      }),
      { WORKER_VERSION: metadata },
      new Request('https://christ-dina.org/login', {
        headers: { cookie: 'dina-version-key=existing' },
      }),
    )

    expect(await bodyResponse.text()).toBe('body')
    expect(bodyResponse.headers.get('x-existing')).toBe('value')
    expect(bodyResponse.headers.get('set-cookie')).toBeNull()
  })

  it('rejects invalid version metadata without changing the response', () => {
    expect(
      readWorkerVersionMetadata({ WORKER_VERSION: { id: 'missing' } }),
    ).toBe(null)
  })
})
