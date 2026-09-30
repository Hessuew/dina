import { describe, expect, it } from 'vitest'

import {
  resolveHealthSmokeUrl,
  validateHealthSmokeResponse,
} from './health-smoke.domain'
import {
  resolveHealthSmokeHeaders,
  validateExpectedReleasePayload,
  validateVersionMetadataHeader,
  validateVersionMetadataTag,
} from './health-smoke.version.domain'

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

describe('resolveHealthSmokeHeaders', () => {
  it('builds the Cloudflare version override header', () => {
    expect(resolveHealthSmokeHeaders('version-123', 'christ-dina')).toEqual({
      'Cloudflare-Workers-Version-Overrides': 'christ-dina="version-123"',
      'Cloudflare-Workers-Version-Key': 'dina-release-smoke-version-123',
    })
  })

  it('rejects incomplete version override configuration', () => {
    expect(() => resolveHealthSmokeHeaders('version-123', undefined)).toThrow()
  })
})

describe('validateVersionMetadataHeader', () => {
  it('accepts the expected Worker version', () => {
    expect(validateVersionMetadataHeader('version-123', 'version-123')).toBe(
      null,
    )
  })

  it('rejects a request served by another version', () => {
    expect(validateVersionMetadataHeader('version-123', 'version-456')).toMatch(
      /expected version-123/u,
    )
  })
})

describe('validateVersionMetadataTag', () => {
  it('accepts the expected release tag', () => {
    expect(validateVersionMetadataTag('v2026.09.29.1', 'v2026.09.29.1')).toBe(
      null,
    )
  })

  it('rejects a response from another release tag', () => {
    expect(
      validateVersionMetadataTag('v2026.09.29.1', 'v2026.09.29.2'),
    ).toMatch(/expected v2026\.09\.29\.1/u)
  })
})

describe('validateExpectedReleasePayload', () => {
  it('accepts a matching release payload', () => {
    expect(
      validateExpectedReleasePayload(
        { release: 'v2026.09.29.1' },
        'v2026.09.29.1',
      ),
    ).toBe(null)
  })

  it('rejects a missing release payload field', () => {
    expect(
      validateExpectedReleasePayload({ status: 'ok' }, 'v2026.09.29.1'),
    ).toMatch(/did not include release/u)
  })
})
