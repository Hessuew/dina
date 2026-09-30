import { validateHealthSmokeResponse } from './health-smoke.domain'
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
  actualVersionId: string | null,
  actualRelease: string | null,
  legacyTarget: boolean,
): RollbackSmokeValidation {
  const healthFailure = validateHealthSmokeResponse(path, statusCode, payload)
  if (healthFailure) return { failure: healthFailure, mode: null }

  const hasVersion = Boolean(actualVersionId?.trim())
  const hasRelease = Boolean(actualRelease?.trim())
  if (!hasVersion && !hasRelease) {
    if (!legacyTarget) {
      return {
        failure: 'response omitted version metadata for a non-legacy target',
        mode: null,
      }
    }
    return { failure: null, mode: 'legacy-header-compatible' }
  }
  if (!hasVersion || !hasRelease) {
    return {
      failure: 'response emitted incomplete version metadata',
      mode: null,
    }
  }
  if (actualVersionId !== expectedVersionId) {
    return {
      failure: `response ran version ${actualVersionId}, expected ${expectedVersionId}`,
      mode: null,
    }
  }
  return { failure: null, mode: 'strict-header' }
}
