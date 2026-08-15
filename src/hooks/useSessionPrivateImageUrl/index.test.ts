// @vitest-environment jsdom

import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useSessionPrivateImageUrl } from '@/hooks/useSessionPrivateImageUrl'
import { resetSessionPrivateImageUrlCache } from '@/hooks/useSessionPrivateImageUrl/cache'

function signedUrl(tokenLabel: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', tokenLabel }))
  const payload = btoa(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3_600 }),
  )
  return `https://project.supabase.co/storage/v1/object/sign/avatars/u/avatar.webp?token=${header}.${payload}.signature`
}

beforeEach(resetSessionPrivateImageUrlCache)
afterEach(cleanup)

describe('useSessionPrivateImageUrl', () => {
  it('keeps first loaded URL across remount with changed token', () => {
    const first = signedUrl('first')
    const next = signedUrl('next')
    const initial = renderHook(() => useSessionPrivateImageUrl(first))

    expect(initial.result.current).toBe(first)
    initial.unmount()

    const remounted = renderHook(() => useSessionPrivateImageUrl(next))
    expect(remounted.result.current).toBe(first)
  })
})
