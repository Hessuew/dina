import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildPreproductionWranglerConfig,
  parseWranglerConfig,
} from './preproduction-wrangler-config.domain'

const PRODUCTION_HYPERDRIVE_ID = 'fc8915964fb8466c81f83fcd27e77833'
const DEVELOPMENT_HYPERDRIVE_ID = 'a'.repeat(32)

function baseConfig() {
  return {
    name: 'christ-dina',
    compatibility_date: '2026-04-23',
    main: 'src/server.ts',
    assets: { directory: 'dist/client', binding: 'ASSETS' },
    vars: { RELEASE_ALERTS_SLACK_INCIDENTS: 'false' },
    hyperdrive: [{ binding: 'HYPERDRIVE', id: PRODUCTION_HYPERDRIVE_ID }],
    version_metadata: { binding: 'WORKER_VERSION' },
    routes: [{ pattern: 'christ-dina.org', custom_domain: true }],
    workers_dev: true,
    preview_urls: true,
  }
}

function options(overrides: Record<string, string> = {}) {
  return {
    workerName: 'christ-dina-preproduction',
    hyperdriveId: DEVELOPMENT_HYPERDRIVE_ID,
    ...overrides,
  }
}

describe('parseWranglerConfig', () => {
  it('parses the repository wrangler.jsonc including comments', () => {
    const text = readFileSync(join(process.cwd(), 'wrangler.jsonc'), 'utf8')
    const config = parseWranglerConfig(text)

    expect(config.name).toBe('christ-dina')
    expect(config.hyperdrive).toEqual([
      { binding: 'HYPERDRIVE', id: PRODUCTION_HYPERDRIVE_ID },
    ])
  })
})

describe('buildPreproductionWranglerConfig', () => {
  it('renames the Worker, drops custom-domain routes, and swaps the Hyperdrive id', () => {
    const config = buildPreproductionWranglerConfig(baseConfig(), options())

    expect(config.name).toBe('christ-dina-preproduction')
    expect(config).not.toHaveProperty('routes')
    expect(config.hyperdrive).toEqual([
      { binding: 'HYPERDRIVE', id: DEVELOPMENT_HYPERDRIVE_ID },
    ])
    expect(config.workers_dev).toBe(true)
    expect(config.version_metadata).toEqual({ binding: 'WORKER_VERSION' })
    expect(config.assets).toEqual(baseConfig().assets)
  })

  it('removes nested env blocks so the isolated config stays single-surface', () => {
    const config = buildPreproductionWranglerConfig(
      { ...baseConfig(), env: { production: { name: 'christ-dina' } } },
      options(),
    )

    expect(config).not.toHaveProperty('env')
  })

  it.each<Record<string, string>>([
    { workerName: 'christ-dina' },
    { workerName: 'CHRIST-DINA-PREPRODUCTION' },
    { workerName: ' ' },
    { hyperdriveId: PRODUCTION_HYPERDRIVE_ID },
    { hyperdriveId: 'replace-me' },
    { hyperdriveId: '' },
  ])('rejects unsafe identity %o', (overrides) => {
    expect(() =>
      buildPreproductionWranglerConfig(baseConfig(), options(overrides)),
    ).toThrowError()
  })

  it('refuses to reuse the production Worker name even when the base name changes', () => {
    expect(() =>
      buildPreproductionWranglerConfig(
        { ...baseConfig(), name: 'christ-dina-canary' },
        options({ workerName: 'christ-dina' }),
      ),
    ).toThrowError()
  })

  it('requires a Hyperdrive binding to isolate', () => {
    const { hyperdrive: _hyperdrive, ...withoutHyperdrive } = baseConfig()

    expect(() =>
      buildPreproductionWranglerConfig(withoutHyperdrive, options()),
    ).toThrowError(/Hyperdrive/u)
  })
})
