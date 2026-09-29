import {
  HEALTH_SMOKE_PATHS,
  resolveHealthSmokeHeaders,
  resolveHealthSmokeUrl,
  validateHealthSmokeResponse,
  validateVersionMetadataHeader,
  validateVersionMetadataTag,
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
  headers: Record<string, string>,
  expectedVersionId: string | undefined,
  expectedRelease: string | undefined,
): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(new URL(path, baseUrl), {
      signal: controller.signal,
      headers,
    })
    const payload = await readJson(response)
    assertEndpointResponse(
      path,
      response,
      payload,
      expectedVersionId,
      expectedRelease,
    )
    console.log(`health smoke passed: ${path}`)
  } finally {
    clearTimeout(timer)
  }
}

function assertEndpointResponse(
  path: HealthSmokePath,
  response: Response,
  payload: unknown,
  expectedVersionId: string | undefined,
  expectedRelease: string | undefined,
): void {
  const payloadFailure = validateHealthSmokeResponse(
    path,
    response.status,
    payload,
  )
  const versionFailure = validateVersionMetadataHeader(
    expectedVersionId,
    response.headers.get('x-dina-worker-version'),
  )
  const releaseHeaderFailure = validateVersionMetadataTag(
    expectedRelease,
    response.headers.get('x-dina-worker-version-tag'),
  )
  const releasePayloadFailure = validateReleasePayload(payload, expectedRelease)
  const failure = [
    payloadFailure,
    versionFailure,
    releaseHeaderFailure,
    releasePayloadFailure,
  ].find(Boolean)
  if (failure) throw new Error(`${path}: ${failure}`)
}

function validateReleasePayload(
  payload: unknown,
  expectedRelease: string | undefined,
): string | null {
  if (expectedRelease === undefined) return null
  if (!isHealthPayloadWithRelease(payload)) return null
  if (payload.release === expectedRelease) return null
  return `response release ${payload.release} did not match ${expectedRelease}`
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
  const headers = resolveHealthSmokeHeaders(
    process.env.SMOKE_VERSION_ID,
    process.env.SMOKE_WORKER_NAME,
  )
  const expectedVersionId = process.env.SMOKE_VERSION_ID
  const expectedRelease = process.env.SMOKE_EXPECTED_RELEASE?.trim()
  await Promise.all(
    HEALTH_SMOKE_PATHS.map((path) =>
      checkEndpoint(
        baseUrl,
        path,
        timeoutMs,
        headers,
        expectedVersionId,
        expectedRelease,
      ),
    ),
  )
}

function isHealthPayloadWithRelease(
  value: unknown,
): value is { release: string | null } {
  return typeof value === 'object' && value !== null && 'release' in value
}

try {
  await main()
} catch (error) {
  console.error(
    `health smoke failed: ${error instanceof Error ? error.message : 'unknown error'}`,
  )
  process.exitCode = 1
}
