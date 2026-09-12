import { describe, expect, it } from 'vitest'

import { resolveObservabilityDsn } from './dsn.domain'

describe('resolveObservabilityDsn', () => {
  it('prefers the Better Stack DSN when both destinations are configured', () => {
    expect(
      resolveObservabilityDsn(
        ' https://betterstack.example.test/123 ',
        'https://sentry.example.test/456',
      ),
    ).toBe('https://betterstack.example.test/123')
  })

  it('uses the legacy Sentry-compatible DSN as the rollback fallback', () => {
    expect(
      resolveObservabilityDsn(undefined, ' https://sentry.example.test/456 '),
    ).toBe('https://sentry.example.test/456')
  })

  it('treats blank destinations as unconfigured', () => {
    expect(resolveObservabilityDsn('  ', '\t')).toBeUndefined()
  })
})
