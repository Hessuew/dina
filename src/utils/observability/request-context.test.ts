import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  elapsedMs,
  getRequestId,
  readRequestId,
  withObservabilityRequest,
} from './request-context'

describe('observability request context', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prefers Cloudflare request ids and falls back to x-request-id', () => {
    expect(
      readRequestId(
        new Request('https://christ-dina.org', {
          headers: { 'cf-ray': 'ray-1', 'x-request-id': 'request-1' },
        }),
      ),
    ).toBe('ray-1')
    expect(
      readRequestId(
        new Request('https://christ-dina.org', {
          headers: { 'x-request-id': 'request-2' },
        }),
      ),
    ).toBe('request-2')
  })

  it('generates an id when the request has no correlation header', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-0000-0000-000000000001',
    )

    expect(readRequestId(new Request('https://christ-dina.org'))).toBe(
      '00000000-0000-0000-0000-000000000001',
    )
  })

  it('keeps the request id available to nested server work', async () => {
    const result = await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'request-3' },
      }),
      async () => getRequestId(),
    )

    expect(result).toBe('request-3')
    expect(getRequestId()).toBe('unknown')
  })

  it('does not overwrite an existing nested request context', async () => {
    const result = await withObservabilityRequest(
      new Request('https://christ-dina.org', {
        headers: { 'x-request-id': 'outer' },
      }),
      () =>
        withObservabilityRequest(
          new Request('https://christ-dina.org', {
            headers: { 'x-request-id': 'inner' },
          }),
          async () => getRequestId(),
        ),
    )

    expect(result).toBe('outer')
  })

  it('rounds elapsed time without returning a negative value', () => {
    vi.spyOn(performance, 'now').mockReturnValue(112.4)
    expect(elapsedMs(100)).toBe(12)
  })
})
