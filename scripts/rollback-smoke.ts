import { fetchWithTimeout } from './http'
import {
  HEALTH_SMOKE_PATHS,
  resolveHealthSmokeUrl,
  validateSmokeResponseOrigin,
} from './health-smoke.domain'
import { resolveHealthSmokeHeaders } from './health-smoke.version.domain'
import { validateRollbackSmokeResponse } from './rollback-smoke.domain'

const baseUrl = resolveHealthSmokeUrl(process.env.SMOKE_BASE_URL)
const versionId = requiredEnv('SMOKE_VERSION_ID')
const workerName = requiredEnv('SMOKE_WORKER_NAME')
const expectedRelease = process.env.SMOKE_EXPECTED_RELEASE?.trim()
const legacyTarget = resolveLegacyTarget(process.env.SMOKE_LEGACY_TARGET)
const headers = resolveHealthSmokeHeaders(versionId, workerName)

const modes = await Promise.all(
  HEALTH_SMOKE_PATHS.map(async (path) => {
    const endpointUrl = new URL(path, baseUrl)
    const response = await fetchWithTimeout(endpointUrl, {
      headers,
      redirect: 'manual',
    })
    const originFailure = validateSmokeResponseOrigin(response, endpointUrl)
    if (originFailure) throw new Error(`${path}: ${originFailure}`)
    const payload = await readJson(response)
    const validation = validateRollbackSmokeResponse(
      path,
      response.status,
      payload,
      versionId,
      expectedRelease,
      response.headers.get('x-dina-worker-version'),
      response.headers.get('x-dina-worker-version-tag'),
      legacyTarget,
    )
    if (validation.failure || !validation.mode) {
      throw new Error(`${path}: ${validation.failure ?? 'unknown failure'}`)
    }
    return validation.mode
  }),
)

const mode = modes[0]
if (!mode || modes.some((candidate) => candidate !== mode)) {
  throw new Error(
    'Rollback smoke responses used inconsistent compatibility modes',
  )
}
console.log(`rollback smoke passed: ${mode}`)

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function resolveLegacyTarget(value: string | undefined): boolean {
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error('SMOKE_LEGACY_TARGET must be true or false')
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

export {}
