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

  it('keeps the application 404 for routes without a file extension', async () => {
    const applicationResponse = new Response('not found', { status: 404 })
    const fetchAssets = vi.fn()

    const response = await fetchWithAssetFallback(
      new Request('https://christ-dina.org/login'),
      { ASSETS: { fetch: fetchAssets } },
      async () => applicationResponse,
    )

    expect(response).toBe(applicationResponse)
    expect(fetchAssets).not.toHaveBeenCalled()
  })

  it('keeps the application 404 for non-GET asset requests', async () => {
    const applicationResponse = new Response('not found', { status: 404 })
    const fetchAssets = vi.fn()

    const response = await fetchWithAssetFallback(
      new Request('https://christ-dina.org/assets/app.js', {
        method: 'POST',
      }),
      { ASSETS: { fetch: fetchAssets } },
      async () => applicationResponse,
    )

    expect(response).toBe(applicationResponse)
    expect(fetchAssets).not.toHaveBeenCalled()
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
