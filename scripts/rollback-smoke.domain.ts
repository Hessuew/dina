import { validateHealthSmokeResponse } from './health-smoke.domain'
import { validateExpectedReleasePayload } from './health-smoke.version.domain'
import type { HealthSmokePath } from './health-smoke.domain'

export type RollbackSmokeMode = 'strict-header' | 'legacy-header-compatible'

export type RollbackSmokeValidation = {
  failure: string | null
  mode: RollbackSmokeMode | null
}

export function validateRollbackSmokeResponse(
  path: HealthSmokePath,
  statusCode: number,
  payload: unknown,
  expectedVersionId: string,
  expectedRelease: string | undefined,
  actualVersionId: string | null,
  actualRelease: string | null,
  legacyTarget: boolean,
): RollbackSmokeValidation {
  const healthFailure = validateHealthSmokeResponse(path, statusCode, payload)
  if (healthFailure) return { failure: healthFailure, mode: null }

  const normalizedExpectedRelease = expectedRelease?.trim()
  const hasVersion = Boolean(actualVersionId?.trim())
  const hasRelease = Boolean(actualRelease?.trim())
  if (!hasVersion && !hasRelease) {
    return validateLegacyRollbackSmoke(
      payload,
      normalizedExpectedRelease,
      legacyTarget,
    )
  }
  if (!hasVersion || !hasRelease) {
    return {
      failure: 'response emitted incomplete version metadata',
      mode: null,
    }
  }
  return validateStrictRollbackSmoke(
    payload,
    expectedVersionId,
    normalizedExpectedRelease,
    actualVersionId,
    actualRelease,
  )
}

function validateLegacyRollbackSmoke(
  payload: unknown,
  expectedRelease: string | undefined,
  legacyTarget: boolean,
): RollbackSmokeValidation {
  if (!legacyTarget) {
    return {
      failure: 'response omitted version metadata for a non-legacy target',
      mode: null,
    }
  }
  if (expectedRelease) {
    const payloadReleaseFailure = validateOptionalReleasePayload(
      payload,
      expectedRelease,
    )
    if (payloadReleaseFailure) {
      return { failure: payloadReleaseFailure, mode: null }
    }
  }
  return { failure: null, mode: 'legacy-header-compatible' }
}

function validateStrictRollbackSmoke(
  payload: unknown,
  expectedVersionId: string,
  expectedRelease: string | undefined,
  actualVersionId: string | null,
  actualRelease: string | null,
): RollbackSmokeValidation {
  if (actualVersionId !== expectedVersionId) {
    return {
      failure: `response ran version ${actualVersionId}, expected ${expectedVersionId}`,
      mode: null,
    }
  }
  if (!expectedRelease) {
    return {
      failure: 'response emitted release metadata without an expected release',
      mode: null,
    }
  }
  if (actualRelease !== expectedRelease) {
    return {
      failure: `response ran release ${actualRelease}, expected ${expectedRelease}`,
      mode: null,
    }
  }
  const payloadReleaseFailure = validateExpectedReleasePayload(
    payload,
    expectedRelease,
  )
  if (payloadReleaseFailure) {
    return { failure: payloadReleaseFailure, mode: null }
  }
  return { failure: null, mode: 'strict-header' }
}

function validateOptionalReleasePayload(
  payload: unknown,
  expectedRelease: string,
): string | null {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('release' in payload)
  ) {
    return null
  }
  return validateExpectedReleasePayload(payload, expectedRelease)
}
