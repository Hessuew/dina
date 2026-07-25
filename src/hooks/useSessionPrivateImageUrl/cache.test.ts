import { beforeEach, describe, expect, it } from 'vitest'
import {
  getPrivateImageCacheKey,
  resetSessionPrivateImageUrlCache,
  resolveSessionPrivateImageUrl,
  setSessionPrivateImageCacheUser,
} from '@/hooks/useSessionPrivateImageUrl/cache'

const NOW = Date.parse('2026-07-25T12:00:00Z')

function signedUrl(
  bucket: 'avatars' | 'course-thumbnails' | 'media-thumbnails',
  path: string,
  tokenLabel: string,
  expiresAt = NOW + 3_600_000,
): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', tokenLabel }))
  const payload = btoa(JSON.stringify({ exp: expiresAt / 1000 }))
  return `https://project.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=${header}.${payload}.signature`
}

beforeEach(() => {
  resetSessionPrivateImageUrlCache()
  setSessionPrivateImageCacheUser(undefined)
})

describe('getPrivateImageCacheKey', () => {
  it('extracts stable storage pathname without token query', () => {
    expect(
      getPrivateImageCacheKey(signedUrl('avatars', 'user/avatar.webp', 'a')),
    ).toBe('/storage/v1/object/sign/avatars/user/avatar.webp')
  })

  it('rejects external, public, malformed, and missing values', () => {
    expect(getPrivateImageCacheKey('https://cdn.example.com/avatar.png')).toBe(
      null,
    )
    expect(
      getPrivateImageCacheKey(
        'https://project.supabase.co/storage/v1/object/public/avatars/a.png',
      ),
    ).toBe(null)
    expect(getPrivateImageCacheKey('not a url')).toBe(null)
    expect(getPrivateImageCacheKey(null)).toBe(null)
  })
})

describe('resolveSessionPrivateImageUrl', () => {
  it('reuses first valid token for same storage path', () => {
    const first = signedUrl('avatars', 'user/avatar.webp', 'first')
    const next = signedUrl('avatars', 'user/avatar.webp', 'next')

    expect(resolveSessionPrivateImageUrl(first, NOW)).toBe(first)
    expect(resolveSessionPrivateImageUrl(next, NOW + 10_000)).toBe(first)
  })

  it('uses incoming URL for a different path', () => {
    const first = signedUrl('avatars', 'user/first.webp', 'first')
    const different = signedUrl('avatars', 'user/second.webp', 'second')

    resolveSessionPrivateImageUrl(first, NOW)
    expect(resolveSessionPrivateImageUrl(different, NOW + 10_000)).toBe(
      different,
    )
  })

  it('refreshes from incoming token near cached expiry', () => {
    const expiring = signedUrl(
      'course-thumbnails',
      'course/thumb.webp',
      'old',
      NOW + 70_000,
    )
    const refreshed = signedUrl(
      'course-thumbnails',
      'course/thumb.webp',
      'new',
      NOW + 3_600_000,
    )

    resolveSessionPrivateImageUrl(expiring, NOW)
    expect(resolveSessionPrivateImageUrl(refreshed, NOW + 15_000)).toBe(
      refreshed,
    )
  })

  it('leaves malformed tokens, external URLs, and null unchanged', () => {
    const malformed =
      'https://project.supabase.co/storage/v1/object/sign/avatars/u/a.png?token=nope'
    expect(resolveSessionPrivateImageUrl(malformed, NOW)).toBe(malformed)
    expect(resolveSessionPrivateImageUrl('https://cdn/x.png', NOW)).toBe(
      'https://cdn/x.png',
    )
    expect(resolveSessionPrivateImageUrl(null, NOW)).toBe(null)
  })

  it('clears cached URLs explicitly and when user changes', () => {
    const first = signedUrl('avatars', 'user/avatar.webp', 'first')
    const next = signedUrl('avatars', 'user/avatar.webp', 'next')
    resolveSessionPrivateImageUrl(first, NOW)

    resetSessionPrivateImageUrlCache()
    expect(resolveSessionPrivateImageUrl(next, NOW + 10_000)).toBe(next)

    setSessionPrivateImageCacheUser('user-a')
    resolveSessionPrivateImageUrl(first, NOW)
    setSessionPrivateImageCacheUser('user-b')
    expect(resolveSessionPrivateImageUrl(next, NOW + 10_000)).toBe(next)
  })
})
