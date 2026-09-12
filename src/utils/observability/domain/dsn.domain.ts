/**
 * Resolve the application error destination during the Better Stack cutover.
 * The legacy value remains a deliberate rollback path until the cutover is
 * verified in every deployment environment.
 */
export function resolveObservabilityDsn(
  betterStackDsn?: string | null,
  legacyDsn?: string | null,
): string | undefined {
  return normalizeDsn(betterStackDsn) ?? normalizeDsn(legacyDsn)
}

function normalizeDsn(value?: string | null): string | undefined {
  const dsn = value?.trim()
  return dsn || undefined
}
