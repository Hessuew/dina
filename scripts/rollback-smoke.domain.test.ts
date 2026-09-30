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
        'other-version',
        'v2026.09.30.1',
        false,
      ),
    ).toEqual({
      failure: 'response ran version other-version, expected expected-version',
      mode: null,
    })
  })
})
