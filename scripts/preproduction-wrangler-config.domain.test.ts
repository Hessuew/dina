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

  it('keeps only the safe allowlist and drops shared side-effect bindings', () => {
    const config = buildPreproductionWranglerConfig(
      {
        ...baseConfig(),
        compatibility_flags: ['nodejs_compat'],
        observability: { enabled: true },
        $schema: 'node_modules/wrangler/config-schema.json',
        analytics_engine_datasets: [
          { binding: 'RELEASE_METRICS', dataset: 'dina_release_metrics' },
        ],
        queues: {
          producers: [{ binding: 'RELEASE_QUEUE', queue: 'release-queue' }],
          consumers: [{ queue: 'release-queue' }],
        },
        triggers: { crons: ['0 * * * *'] },
        durable_objects: {
          bindings: [{ name: 'COUNTER', class_name: 'Counter' }],
        },
        services: [{ binding: 'INTERNAL', service: 'christ-dina-internal' }],
        kv_namespaces: [{ binding: 'KV', id: 'a'.repeat(32) }],
        env: { staging: { name: 'christ-dina-staging' } },
      },
      options(),
    )

    expect(Object.keys(config).sort()).toEqual([
      'assets',
      'compatibility_date',
      'compatibility_flags',
      'hyperdrive',
      'main',
      'name',
      'observability',
      'preview_urls',
      'vars',
      'version_metadata',
      'workers_dev',
    ])
    expect(config.vars).toEqual(baseConfig().vars)
  })

  it('strips the shared production metrics dataset from the repository config', () => {
    const text = readFileSync(join(process.cwd(), 'wrangler.jsonc'), 'utf8')
    const config = buildPreproductionWranglerConfig(
      parseWranglerConfig(text),
      options(),
    )

    expect(config).not.toHaveProperty('analytics_engine_datasets')
    expect(config).not.toHaveProperty('routes')
    expect(config).not.toHaveProperty('env')
    expect(config.hyperdrive).toEqual([
      { binding: 'HYPERDRIVE', id: DEVELOPMENT_HYPERDRIVE_ID },
    ])
    expect(config.observability).toEqual(
      parseWranglerConfig(text).observability,
    )
  })

  it.each<Record<string, string>>([
    { workerName: 'christ-dina' },
    { workerName: 'CHRIST-DINA-PREPRODUCTION' },
    { workerName: ' ' },
    { hyperdriveId: PRODUCTION_HYPERDRIVE_ID },
    { hyperdriveId: PRODUCTION_HYPERDRIVE_ID.toUpperCase() },
    { hyperdriveId: 'replace-me' },
    { hyperdriveId: '' },
  ])('rejects unsafe identity %o', (overrides) => {
    expect(() =>
      buildPreproductionWranglerConfig(baseConfig(), options(overrides)),
    ).toThrowError()
  })

  it('rejects the production Hyperdrive id regardless of the base config letter case', () => {
    expect(() =>
      buildPreproductionWranglerConfig(
        {
          ...baseConfig(),
          hyperdrive: [
            {
              binding: 'HYPERDRIVE',
              id: PRODUCTION_HYPERDRIVE_ID.toUpperCase(),
            },
          ],
        },
        options({ hyperdriveId: PRODUCTION_HYPERDRIVE_ID }),
      ),
    ).toThrowError()
  })

  it('normalizes a mixed-case Hyperdrive id before emitting it', () => {
    const config = buildPreproductionWranglerConfig(
      baseConfig(),
      options({ hyperdriveId: 'A'.repeat(32) }),
    )

    expect(config.hyperdrive).toEqual([
      { binding: 'HYPERDRIVE', id: DEVELOPMENT_HYPERDRIVE_ID },
    ])
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
