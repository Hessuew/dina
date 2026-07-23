import { describe, expect, it } from 'vitest'
import {
  buildOwnedStoragePath,
  extractPrivateStoragePath,
  isOwnedStoragePath,
} from './private-storage.domain'

describe('extractPrivateStoragePath', () => {
  it('keeps a canonical path', () => {
    expect(extractPrivateStoragePath('u-1/file.webp', 'avatars')).toBe(
      'u-1/file.webp',
    )
  })

  it('extracts public, signed, and authenticated object URLs', () => {
    const root = 'https://x.supabase.co/storage/v1/object'
    expect(
      extractPrivateStoragePath(`${root}/public/avatars/u/a.webp`, 'avatars'),
    ).toBe('u/a.webp')
    expect(
      extractPrivateStoragePath(
        `${root}/sign/avatars/u/a.webp?token=abc`,
        'avatars',
      ),
    ).toBe('u/a.webp')
    expect(
      extractPrivateStoragePath(
        `${root}/authenticated/avatars/u/a.webp`,
        'avatars',
      ),
    ).toBe('u/a.webp')
  })

  it('rejects external URLs, query-bearing paths, and the wrong bucket', () => {
    expect(
      extractPrivateStoragePath('https://cdn.test/a.webp', 'avatars'),
    ).toBe(null)
    expect(extractPrivateStoragePath('u/a.webp?token=x', 'avatars')).toBe(null)
    expect(
      extractPrivateStoragePath(
        'https://x/storage/v1/object/public/media-library/u/a.pdf',
        'avatars',
      ),
    ).toBe(null)
  })

  it('returns null for empty values', () => {
    expect(extractPrivateStoragePath(null, 'avatars')).toBe(null)
    expect(extractPrivateStoragePath('  ', 'avatars')).toBe(null)
  })
})

describe('owned storage paths', () => {
  it('accepts current folder paths and legacy prefixed object names', () => {
    expect(isOwnedStoragePath('u-1/123.webp', 'u-1')).toBe(true)
    expect(isOwnedStoragePath('u-1-123.webp', 'u-1')).toBe(true)
    expect(isOwnedStoragePath('u-10/123.webp', 'u-1')).toBe(false)
  })

  it('builds a versioned path under the actor folder', () => {
    expect(buildOwnedStoragePath('u-1', 'webp', 123, 'abc')).toBe(
      'u-1/123-abc.webp',
    )
  })
})
