import { describe, expect, it } from 'vitest'

import {
  extractFirstPartyAssetUrls,
  versionHeaders,
} from './release-journey-smoke.domain'

describe('release journey smoke helpers', () => {
  it('extracts only same-origin hashed JavaScript and CSS assets', () => {
    const assets = extractFirstPartyAssetUrls(
      new URL('https://christ-dina.org/login'),
      '<script src="/assets/app-abc123.js"></script><link href="/assets/app-def456.css?x=1" rel="stylesheet"><script src="https://cdn.example.test/app.js"></script>',
    )

    expect(assets.map((asset) => asset.href)).toEqual([
      'https://christ-dina.org/assets/app-abc123.js',
      'https://christ-dina.org/assets/app-def456.css?x=1',
    ])
  })

  it('pins journey requests to the exact Worker version', () => {
    expect(versionHeaders('christ-dina', 'version-123')).toEqual({
      'Cloudflare-Workers-Version-Overrides': 'christ-dina="version-123"',
      'Cloudflare-Workers-Version-Key': 'dina-release-smoke-version-123',
    })
  })
})
