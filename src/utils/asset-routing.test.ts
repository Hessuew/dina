import { describe, expect, it, vi } from 'vitest'

import { fetchWithAssetFallback } from './asset-routing'

describe('fetchWithAssetFallback', () => {
  it('serves the asset binding response after the application returns 404', async () => {
    const request = new Request('https://christ-dina.org/assets/app.js')
    const assetResponse = new Response('asset', {
      headers: {
        'cache-control': 'public, max-age=31536000, immutable',
        'content-type': 'text/javascript',
      },
    })
    const fetchAssets = vi.fn(async (assetRequest: Request) => {
      expect(assetRequest).toBe(request)
      return assetResponse
    })

    const response = await fetchWithAssetFallback(
      request,
      { ASSETS: { fetch: fetchAssets } },
      async () => new Response('not found', { status: 404 }),
    )

    expect(response).toBe(assetResponse)
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    )
    expect(fetchAssets).toHaveBeenCalledOnce()
  })

  it('preserves application responses and does not require an asset binding', async () => {
    const applicationResponse = new Response('application', { status: 200 })
    const fetchApplication = vi.fn(async () => applicationResponse)

    const response = await fetchWithAssetFallback(
      new Request('https://christ-dina.org/login'),
      {},
      fetchApplication,
    )

    expect(response).toBe(applicationResponse)
    expect(fetchApplication).toHaveBeenCalledOnce()
  })
})
