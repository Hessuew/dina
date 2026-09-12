import { describe, expect, it } from 'vitest'

import { resolveObservabilityIdentity } from './identity.domain'

describe('resolveObservabilityIdentity', () => {
  it('maps development builds to the local environment', () => {
    expect(resolveObservabilityIdentity('development')).toEqual({
      environment: 'local',
      release: undefined,
    })
  })

  it('maps production builds to the production environment', () => {
    expect(resolveObservabilityIdentity('production')).toEqual({
      environment: 'production',
      release: undefined,
    })
  })

  it('maps other build modes to preview', () => {
    expect(resolveObservabilityIdentity('cf')).toEqual({
      environment: 'preview',
      release: undefined,
    })
  })

  it('uses a valid configured environment and normalizes the release', () => {
    expect(
      resolveObservabilityIdentity('development', ' Production ', ' abc123 '),
    ).toEqual({ environment: 'production', release: 'abc123' })
  })

  it('ignores unknown environments and empty releases', () => {
    expect(resolveObservabilityIdentity('cf', 'staging', '   ')).toEqual({
      environment: 'preview',
      release: undefined,
    })
  })
})
