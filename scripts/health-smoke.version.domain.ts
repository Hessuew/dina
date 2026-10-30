export type HealthSmokeHeaders = Record<string, string>

export function resolveHealthSmokeHeaders(
  versionId: string | undefined,
  workerName: string | undefined,
): HealthSmokeHeaders {
  const normalizedVersionId = versionId?.trim()
  const normalizedWorkerName = workerName?.trim()
  if (!normalizedVersionId && !normalizedWorkerName) return {}
  if (!normalizedVersionId || !normalizedWorkerName) {
    throw new Error(
      'SMOKE_VERSION_ID and SMOKE_WORKER_NAME must be supplied together',
    )
  }

  return {
    'Cloudflare-Workers-Version-Overrides': `${normalizedWorkerName}="${normalizedVersionId}"`,
    'Cloudflare-Workers-Version-Key': `dina-release-smoke-${normalizedVersionId}`,
  }
}

export function validateVersionMetadataHeader(
  expectedVersionId: string | undefined,
  actualVersionId: string | null,
): string | null {
  const expected = expectedVersionId?.trim()
  if (!expected) return null
  if (actualVersionId !== expected) {
    return `response ran version ${actualVersionId ?? 'unknown'}, expected ${expected}`
  }
  return null
}

export function validateVersionMetadataTag(
  expectedRelease: string | undefined,
  actualRelease: string | null,
): string | null {
  const expected = expectedRelease?.trim()
  if (!expected) return null
  if (actualRelease !== expected) {
    return `response ran release ${actualRelease ?? 'unknown'}, expected ${expected}`
  }
  return null
}

export function validateExpectedReleasePayload(
  payload: unknown,
  expectedRelease: string | undefined,
): string | null {
  if (expectedRelease === undefined) return null
  if (!isRecord(payload) || !('release' in payload)) {
    return `response did not include release ${expectedRelease}`
  }
  if (payload.release === expectedRelease) return null
  const actualRelease =
    typeof payload.release === 'string' ? payload.release : 'unknown'
  return `response release ${actualRelease} did not match ${expectedRelease}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
