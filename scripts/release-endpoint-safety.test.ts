import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'

const execFileAsync = promisify(execFile)

describe('release endpoint adapters', () => {
  it.each([
    {
      name: 'release evidence',
      script: 'scripts/release-evidence.ts',
      urlName: 'PRODUCTION_RELEASE_EVIDENCE_URL',
      environment: {
        PRODUCTION_RELEASE_EVIDENCE_TOKEN: 'evidence-token',
        RELEASE_TAG: 'v2026.09.30.1',
        TARGET_SHA: 'a'.repeat(40),
        CLOUDFLARE_VERSION_ID: 'version-1',
        PRODUCTION_ORIGIN: 'https://example.test',
      },
    },
    {
      name: 'version metrics',
      script: 'scripts/release-metrics.ts',
      urlName: 'CLOUDFLARE_VERSION_METRICS_URL',
      environment: {
        CLOUDFLARE_VERSION_METRICS_TOKEN: 'metrics-token',
        CLOUDFLARE_VERSION_ID: 'version-1',
        WORKER_NAME: 'christ-dina',
        CLOUDFLARE_METRICS_SINCE: '2026-09-30T10:00:00Z',
        CLOUDFLARE_METRICS_UNTIL: '2026-09-30T10:05:00Z',
      },
    },
  ])(
    'rejects unsafe URLs before sending the $name bearer token',
    async ({ script, urlName, environment }) => {
      let requestCount = 0
      const server = createServer((_request, response) => {
        requestCount += 1
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end('{}')
      })
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', () => resolve())
      })
      const address = server.address()
      if (!address || typeof address === 'string') {
        throw new Error('Test server did not expose a TCP address')
      }

      let errorOutput = ''
      try {
        await execFileAsync('bun', ['run', script], {
          env: {
            ...process.env,
            ...environment,
            [urlName]: `http://127.0.0.1:${address.port}/unsafe`,
          },
        })
      } catch (error) {
        errorOutput = readErrorOutput(error)
      } finally {
        await promisify(server.close.bind(server))()
      }

      expect(errorOutput).toMatch(/absolute HTTPS URL/u)
      expect(requestCount).toBe(0)
    },
  )
})

function readErrorOutput(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'stderr' in error) {
    return String(error.stderr)
  }
  return String(error)
}
