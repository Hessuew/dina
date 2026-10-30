import { describe, expect, it } from 'vitest'

import {
  extractFirstPartyAssetUrls,
  parseJourneyPaths,
} from './release-journey-smoke.domain'

describe('release journey smoke helpers', () => {
  it('parses and validates configured public journey paths', () => {
    expect(parseJourneyPaths(' /login, /enrolment, /login ')).toEqual([
      '/login',
      '/enrolment',
    ])
  })

  it('rejects missing or non-path journey configuration', () => {
    expect(() => parseJourneyPaths('')).toThrow(/at least one/iu)
    expect(() => parseJourneyPaths('https://evil.example')).toThrow(
      /invalid journey path/iu,
    )
  })

  it('extracts only same-origin hashed JavaScript and CSS assets', () => {
    const assets = extractFirstPartyAssetUrls(
      new URL('https://christ-dina.org/login'),
      '<script src="/assets/app-abc12345.js"></script><link href="/assets/app-def45678.css?x=1" rel="stylesheet"><script src="/assets/app.js"></script><script src="https://cdn.example.test/app.js"></script>',
    )

    expect(assets.map((asset) => asset.href)).toEqual([
      'https://christ-dina.org/assets/app-abc12345.js',
      'https://christ-dina.org/assets/app-def45678.css?x=1',
    ])
  })
})
