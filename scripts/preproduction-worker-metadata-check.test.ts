import { describe, expect, it, vi } from 'vitest'
import { checkPreproductionWorkerMetadata } from './preproduction-worker-metadata-check'

function success(result: unknown): Response {
  return new Response(JSON.stringify({ success: true, result }), {
    status: 200,
  })
}

function serviceResponse(lastDeployedFrom: string | undefined): Response {
  return success({
    default_environment: {
      environment: 'production',
      script: { last_deployed_from: lastDeployedFrom },
    },
  })
}

function fetcherFor(
  lastDeployedFrom: string | undefined,
  overrides: (url: URL) => Response | undefined = () => undefined,
) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/workers/services/christ-dina-preproduction')) {
      return serviceResponse(lastDeployedFrom)
    }
    return overrides(url) ?? success([])
  })
}

function options(
  fetcher: ReturnType<typeof fetcherFor>,
  write: ReturnType<typeof vi.fn>,
) {
  return {
    accountId: 'account-id',
    token: 'private-token',
    workerName: 'christ-dina-preproduction',
    fetcher,
    write,
  }
}

describe('checkPreproductionWorkerMetadata', () => {
  it('checks every surface Wrangler reads for a dashboard-managed worker', async () => {
    const fetcher = fetcherFor('dash')
    const write = vi.fn()

    await expect(
      checkPreproductionWorkerMetadata(options(fetcher, write)),
    ).resolves.toBe(true)

    expect(fetcher).toHaveBeenCalledTimes(11)
    const base =
      'https://api.cloudflare.com/client/v4/accounts/account-id'
    const headers = { headers: { Authorization: 'Bearer private-token' } }
    for (const path of [
      '/workers/services/christ-dina-preproduction',
      '/workers/scripts/christ-dina-preproduction/secrets',
      '/workers/scripts/christ-dina-preproduction/versions?deployable=true',
      '/workers/scripts/christ-dina-preproduction/deployments',
      '/workers/workers/christ-dina-preproduction',
      '/workers/services/christ-dina-preproduction/environments/production/bindings',
      '/workers/services/christ-dina-preproduction/environments/production/routes?show_zonename=true',
      '/workers/services/christ-dina-preproduction/environments/production/subdomain',
      '/workers/services/christ-dina-preproduction/environments/production',
      '/workers/scripts/christ-dina-preproduction/schedules',
      '/workers/domains/records?page=0&per_page=5&service=christ-dina-preproduction&environment=production',
    ]) {
      expect(fetcher).toHaveBeenCalledWith(`${base}${path}`, headers)
    }
    expect(write).toHaveBeenCalledWith('routes: HTTP 200')
    expect(write.mock.calls.join(' ')).not.toContain('private-token')
  })

  it('skips dashboard config surfaces when the worker was not deployed from the dashboard', async () => {
    const fetcher = fetcherFor('wrangler')
    const write = vi.fn()

    await expect(
      checkPreproductionWorkerMetadata(options(fetcher, write)),
    ).resolves.toBe(true)

    expect(fetcher).toHaveBeenCalledTimes(5)
    const paths = fetcher.mock.calls.map(([input]) =>
      new URL(String(input)).pathname,
    )
    expect(
      paths.some((path) => path.includes('/environments/')),
    ).toBe(false)
    expect(paths.some((path) => path.includes('/schedules'))).toBe(false)
    expect(write).toHaveBeenCalledWith(
      "service: remote worker config surfaces skipped (last_deployed_from: wrangler)",
    )
  })

  it('reports the failing surface without printing Cloudflare response contents', async () => {
    const fetcher = fetcherFor('dash', (url) => {
      if (url.pathname.endsWith('/environments/production/routes')) {
        return new Response(
          JSON.stringify({
            success: false,
            errors: [{ code: 10000, message: 'sensitive response detail' }],
          }),
          { status: 403 },
        )
      }
      return undefined
    })
    const write = vi.fn()

    await expect(
      checkPreproductionWorkerMetadata(options(fetcher, write)),
    ).resolves.toBe(false)

    expect(write).toHaveBeenCalledWith(
      'routes: HTTP 403 (Cloudflare codes: 10000)',
    )
    expect(write.mock.calls.join(' ')).not.toContain('private-token')
    expect(write.mock.calls.join(' ')).not.toContain('sensitive response detail')
  })
})
