import { describe, expect, it, vi } from 'vitest'
import { checkPreproductionWorkerMetadata } from './preproduction-worker-metadata-check'

function success(result: unknown): Response {
  return new Response(JSON.stringify({ success: true, result }), {
    status: 200,
  })
}

describe('checkPreproductionWorkerMetadata', () => {
  it('checks the same service metadata surfaces before Wrangler uploads a version', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/workers/services/christ-dina-preproduction')) {
        return success({ default_environment: { environment: 'production' } })
      }
      return success([])
    })
    const write = vi.fn()

    await expect(
      checkPreproductionWorkerMetadata({
        accountId: 'account-id',
        token: 'private-token',
        workerName: 'christ-dina-preproduction',
        fetcher,
        write,
      }),
    ).resolves.toBe(true)

    expect(fetcher).toHaveBeenCalledTimes(7)
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/accounts/account-id/workers/services/christ-dina-preproduction/environments/production/routes?show_zonename=true',
      { headers: { Authorization: 'Bearer private-token' } },
    )
    expect(write).toHaveBeenCalledWith('routes: HTTP 200')
    expect(write.mock.calls.join(' ')).not.toContain('private-token')
  })

  it('reports the failing surface without printing Cloudflare response contents', async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/workers/services/christ-dina-preproduction')) {
        return success({ default_environment: { environment: 'production' } })
      }
      if (url.pathname.endsWith('/environments/production/routes')) {
        return new Response(
          JSON.stringify({
            success: false,
            errors: [{ code: 10000, message: 'sensitive response detail' }],
          }),
          { status: 403 },
        )
      }
      return success([])
    })
    const write = vi.fn()

    await expect(
      checkPreproductionWorkerMetadata({
        accountId: 'account-id',
        token: 'private-token',
        workerName: 'christ-dina-preproduction',
        fetcher,
        write,
      }),
    ).resolves.toBe(false)

    expect(write).toHaveBeenCalledWith(
      'routes: HTTP 403 (Cloudflare codes: 10000)',
    )
    expect(write.mock.calls.join(' ')).not.toContain('private-token')
    expect(write.mock.calls.join(' ')).not.toContain('sensitive response detail')
  })
})
