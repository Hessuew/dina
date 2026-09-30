import { describe, expect, it, vi } from 'vitest'

import { fetchWithTimeout } from './http'

describe('fetchWithTimeout', () => {
  it('preserves redirect and response URL metadata', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        arrayBuffer: async () => new TextEncoder().encode('ok').buffer,
        headers: new Headers({ 'content-type': 'text/plain' }),
        redirected: true,
        status: 200,
        statusText: 'OK',
        url: 'https://attacker.example/healthz',
      })),
    )

    const response = await fetchWithTimeout(
      new URL('https://example.com/healthz'),
      {},
    )

    expect(response.redirected).toBe(true)
    expect(response.url).toBe('https://attacker.example/healthz')
    await expect(response.text()).resolves.toBe('ok')
  })
})
