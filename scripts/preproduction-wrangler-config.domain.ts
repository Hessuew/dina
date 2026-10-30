import ts from 'typescript'

export type WranglerConfig = Record<string, unknown>

export type PreproductionConfigOptions = {
  workerName: string
  hyperdriveId: string
}

const WORKER_NAME_PATTERN = /^[a-z0-9-]{1,63}$/u
const HYPERDRIVE_ID_PATTERN = /^[0-9a-f]{32}$/iu
const PRODUCTION_WORKER_NAME = 'christ-dina'

export function parseWranglerConfig(text: string): WranglerConfig {
  const parsed = ts.parseConfigFileTextToJson('wrangler.jsonc', text)
  if (parsed.error || typeof parsed.config !== 'object' || !parsed.config) {
    throw new Error('wrangler.jsonc could not be parsed')
  }
  return parsed.config as WranglerConfig
}

export function buildPreproductionWranglerConfig(
  base: WranglerConfig,
  options: PreproductionConfigOptions,
): WranglerConfig {
  const workerName = options.workerName.trim()
  const hyperdriveId = options.hyperdriveId.trim()
  validatePreproductionIdentity(base, workerName, hyperdriveId)

  const config: WranglerConfig = { ...base, name: workerName }
  delete config.routes
  delete config.env

  const hyperdrive = Array.isArray(base.hyperdrive) ? base.hyperdrive : []
  const binding = hyperdrive[0]
  if (typeof binding !== 'object' || !binding) {
    throw new Error('wrangler.jsonc has no Hyperdrive binding to isolate')
  }
  config.hyperdrive = [{ ...binding, id: hyperdriveId }]
  return config
}

function validatePreproductionIdentity(
  base: WranglerConfig,
  workerName: string,
  hyperdriveId: string,
): void {
  if (!WORKER_NAME_PATTERN.test(workerName)) {
    throw new Error(
      'PREPRODUCTION_WORKER_NAME must be a lowercase Worker name (a-z, 0-9, -)',
    )
  }
  if (workerName === PRODUCTION_WORKER_NAME || workerName === base.name) {
    throw new Error(
      'The pre-production Worker name must not reuse the production Worker name',
    )
  }
  if (!HYPERDRIVE_ID_PATTERN.test(hyperdriveId)) {
    throw new Error(
      'PREPRODUCTION_HYPERDRIVE_ID must be a Hyperdrive configuration id',
    )
  }
  const productionIds = productionHyperdriveIds(base)
  if (productionIds.includes(hyperdriveId)) {
    throw new Error(
      'The pre-production Hyperdrive must not reuse the production binding',
    )
  }
}

function productionHyperdriveIds(base: WranglerConfig): Array<string> {
  if (!Array.isArray(base.hyperdrive)) return []
  return base.hyperdrive.flatMap((entry) =>
    typeof entry === 'object' &&
    entry &&
    typeof (entry as { id?: unknown }).id === 'string'
      ? [(entry as { id: string }).id]
      : [],
  )
}
