import { describe, expect, it } from 'vitest'

import {
  resolveHealthSmokeUrl,
  validateHealthSmokeResponse,
} from './health-smoke.domain'

const healthyPayload = {
  status: 'ok',
  service: 'christ-dina',
  requestId: 'request-123',
}

describe('resolveHealthSmokeUrl', () => {
  it('accepts an origin URL', () => {
    expect(resolveHealthSmokeUrl(' https://example.com/ ').origin).toBe(
      'https://example.com',
    )
  })

  it.each([
    undefined,
    '',
    'ftp://example.com',
    'https://user:pass@example.com',
    'https://example.com/preview',
    'https://example.com?token=secret',
  ])('rejects unsafe or invalid input %s', (value) => {
    expect(() => resolveHealthSmokeUrl(value)).toThrow()
  })
})

describe('validateHealthSmokeResponse', () => {
  it('accepts healthy liveness and readiness payloads', () => {
    expect(validateHealthSmokeResponse('/healthz', 200, healthyPayload)).toBe(
      null,
    )
    expect(
      validateHealthSmokeResponse('/readyz', 200, {
        ...healthyPayload,
        dependencies: { database: { status: 'ok' } },
      }),
    ).toBe(null)
  })

  it.each([
    [503, healthyPayload],
    [200, { ...healthyPayload, status: 'error' }],
    [200, { ...healthyPayload, service: 'other-service' }],
    [200, { ...healthyPayload, requestId: '' }],
    [
      200,
      { ...healthyPayload, dependencies: { database: { status: 'error' } } },
    ],
    [200, null],
  ])('rejects an unhealthy response: %s', (statusCode, payload) => {
    expect(validateHealthSmokeResponse('/readyz', statusCode, payload)).toEqual(
      expect.any(String),
    )
  })
})
