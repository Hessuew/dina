import { describe, expect, it } from 'vitest'

import { validateRollbackSmokeResponse } from './rollback-smoke.domain'

const healthyPayload = {
  status: 'ok',
  service: 'christ-dina',
  requestId: 'request-123',
}

describe('validateRollbackSmokeResponse', () => {
  it('accepts legacy rollback targets with exact health proof', () => {
    expect(
      validateRollbackSmokeResponse(
        '/healthz',
        200,
        healthyPayload,
        'legacy-version',
        'v2026.09.30.1',
        null,
        null,
        true,
      ),
    ).toEqual({ failure: null, mode: 'legacy-header-compatible' })
  })

  it('rejects missing headers for a non-legacy rollback target', () => {
    expect(
      validateRollbackSmokeResponse(
        '/readyz',
        200,
        { ...healthyPayload, dependencies: { database: { status: 'ok' } } },
        'release-version',
        'v2026.09.30.1',
        null,
        null,
        false,
      ),
    ).toEqual({
      failure: 'response omitted version metadata for a non-legacy target',
      mode: null,
    })
  })

  it('rejects a rollback response from the wrong version', () => {
    expect(
      validateRollbackSmokeResponse(
        '/healthz',
        200,
        healthyPayload,
        'expected-version',
        'v2026.09.30.1',
        'other-version',
        'v2026.09.30.1',
        false,
      ),
    ).toEqual({
      failure: 'response ran version other-version, expected expected-version',
      mode: null,
    })
  })

  it('requires matching release identity for strict rollback targets', () => {
    expect(
      validateRollbackSmokeResponse(
        '/healthz',
        200,
        { ...healthyPayload, release: 'v2026.09.30.1' },
        'release-version',
        'v2026.09.30.1',
        'release-version',
        'v2026.09.30.1',
        false,
      ),
    ).toEqual({ failure: null, mode: 'strict-header' })
    expect(
      validateRollbackSmokeResponse(
        '/healthz',
        200,
        { ...healthyPayload, release: 'v2026.09.30.1' },
        'release-version',
        'v2026.09.30.1',
        'release-version',
        'v2026.09.30.2',
        false,
      ),
    ).toEqual({
      failure: 'response ran release v2026.09.30.2, expected v2026.09.30.1',
      mode: null,
    })
  })

  it('rejects a strict rollback payload from another release', () => {
    expect(
      validateRollbackSmokeResponse(
        '/readyz',
        200,
        {
          ...healthyPayload,
          dependencies: { database: { status: 'ok' } },
          release: 'v2026.09.30.2',
        },
        'release-version',
        'v2026.09.30.1',
        'release-version',
        'v2026.09.30.1',
        false,
      ),
    ).toEqual({
      failure: 'response release v2026.09.30.2 did not match v2026.09.30.1',
      mode: null,
    })
  })
})
