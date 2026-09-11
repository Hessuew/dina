import {
  HEALTH_SMOKE_PATHS,
  resolveHealthSmokeUrl,
  validateHealthSmokeResponse,
} from './health-smoke.domain'
import type { HealthSmokePath } from './health-smoke.domain'

const DEFAULT_TIMEOUT_MS = 5000

function resolveTimeout(value: string | undefined): number {
  if (!value?.trim()) return DEFAULT_TIMEOUT_MS
  const timeout = Number(value)
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error('SMOKE_TIMEOUT_MS must be a positive number')
  }
  return timeout
}

async function checkEndpoint(
  baseUrl: URL,
  path: HealthSmokePath,
  timeoutMs: number,
): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(new URL(path, baseUrl), {
      signal: controller.signal,
    })
    const payload = await readJson(response)
    const failure = validateHealthSmokeResponse(path, response.status, payload)
    if (failure) throw new Error(`${path}: ${failure}`)
    console.log(`health smoke passed: ${path}`)
  } finally {
    clearTimeout(timer)
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function main(): Promise<void> {
  const baseUrl = resolveHealthSmokeUrl(
    process.argv[2] ?? process.env.SMOKE_BASE_URL,
  )
  const timeoutMs = resolveTimeout(process.env.SMOKE_TIMEOUT_MS)
  await Promise.all(
    HEALTH_SMOKE_PATHS.map((path) => checkEndpoint(baseUrl, path, timeoutMs)),
  )
}

try {
  await main()
} catch (error) {
  console.error(
    `health smoke failed: ${error instanceof Error ? error.message : 'unknown error'}`,
  )
  process.exitCode = 1
}
