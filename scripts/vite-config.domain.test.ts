import { describe, expect, it } from 'vitest'

import {
  buildResolveAlias,
  isCloudflareMode,
  resolveCloudflareClientShim,
  resolveSentryBuildConfig,
} from './vite-config.domain.ts'

describe('isCloudflareMode', () => {
  it('is true for the "cf" mode', () => {
    expect(isCloudflareMode('cf')).toBe(true)
  })

  it('is true for the "production" mode', () => {
    expect(isCloudflareMode('production')).toBe(true)
  })

  it('is false for other modes', () => {
    expect(isCloudflareMode('development')).toBe(false)
  })

  it('is false when the mode is undefined', () => {
    expect(isCloudflareMode(undefined)).toBe(false)
  })
})

describe('buildResolveAlias', () => {
  it('always aliases "@" to the src path', () => {
    expect(buildResolveAlias('/src', '/shim.ts', true)).toEqual({ '@': '/src' })
  })

  it('adds the cloudflare:workers shim alias when not building for cloudflare', () => {
    expect(buildResolveAlias('/src', '/shim.ts', false)).toEqual({
      '@': '/src',
      'cloudflare:workers': '/shim.ts',
    })
  })
})

describe('resolveCloudflareClientShim', () => {
  it('returns the shim path for the cloudflare:workers id on a client request', () => {
    expect(
      resolveCloudflareClientShim('cloudflare:workers', false, '/shim.ts'),
    ).toBe('/shim.ts')
  })

  it('returns the shim path when ssr is undefined', () => {
    expect(
      resolveCloudflareClientShim('cloudflare:workers', undefined, '/shim.ts'),
    ).toBe('/shim.ts')
  })

  it('returns undefined for an ssr request', () => {
    expect(
      resolveCloudflareClientShim('cloudflare:workers', true, '/shim.ts'),
    ).toBeUndefined()
  })

  it('returns undefined for any other id', () => {
    expect(
      resolveCloudflareClientShim('react', false, '/shim.ts'),
    ).toBeUndefined()
  })
})

describe('resolveSentryBuildConfig', () => {
  it('returns no upload configuration until all required values exist', () => {
    expect(
      resolveSentryBuildConfig({
        SENTRY_AUTH_TOKEN: 'token',
        SENTRY_ORG: 'org',
      }),
    ).toBeNull()
  })

  it('trims provider settings and prefers the explicit release value', () => {
    expect(
      resolveSentryBuildConfig({
        SENTRY_AUTH_TOKEN: ' token ',
        SENTRY_ORG: ' org ',
        SENTRY_PROJECT: ' project ',
        SENTRY_RELEASE: ' commit-sha ',
        SENTRY_URL: ' https://errors.example.test ',
        VITE_SENTRY_RELEASE: 'fallback-release',
      }),
    ).toEqual({
      authToken: 'token',
      org: 'org',
      project: 'project',
      release: { name: 'commit-sha' },
      sentryUrl: 'https://errors.example.test',
    })
  })

  it('falls back to the client release when no build release is set', () => {
    expect(
      resolveSentryBuildConfig({
        SENTRY_AUTH_TOKEN: 'token',
        SENTRY_ORG: 'org',
        SENTRY_PROJECT: 'project',
        VITE_SENTRY_RELEASE: 'client-release',
      }),
    ).toEqual({
      authToken: 'token',
      org: 'org',
      project: 'project',
      release: { name: 'client-release' },
    })
  })
})
