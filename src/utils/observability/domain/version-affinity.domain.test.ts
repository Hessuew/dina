import { describe, expect, it } from 'vitest'

import {
  VERSION_AFFINITY_COOKIE_MAX_AGE_SECONDS,
  VERSION_AFFINITY_COOKIE_NAME,
  buildVersionAffinityCookie,
  hasVersionAffinityCookie,
} from './version-affinity.domain'

describe('version affinity cookie helpers', () => {
  it('detects the dedicated cookie among other cookies', () => {
    expect(
      hasVersionAffinityCookie(
        `sidebar_state=true; ${VERSION_AFFINITY_COOKIE_NAME}=stable-key`,
      ),
    ).toBe(true)
  })

  it('does not match a similarly named cookie or an absent header', () => {
    expect(hasVersionAffinityCookie('dina-version-key-extra=value')).toBe(false)
    expect(hasVersionAffinityCookie('dina-version-key=')).toBe(false)
    expect(hasVersionAffinityCookie('dina-version-key= ')).toBe(false)
    expect(hasVersionAffinityCookie(null)).toBe(false)
  })

  it('builds a secure long-lived cookie for the edge transform rule', () => {
    expect(buildVersionAffinityCookie('stable-key')).toBe(
      `${VERSION_AFFINITY_COOKIE_NAME}=stable-key; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${VERSION_AFFINITY_COOKIE_MAX_AGE_SECONDS}`,
    )
  })
})
