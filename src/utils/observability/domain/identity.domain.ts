export type ObservabilityEnvironment = 'local' | 'preview' | 'production'

export type ObservabilityIdentity = {
  environment: ObservabilityEnvironment
  release: string | undefined
}

export function resolveObservabilityIdentity(
  mode: string,
  configuredEnvironment?: string | null,
  configuredRelease?: string | null,
): ObservabilityIdentity {
  return {
    environment: resolveObservabilityEnvironment(mode, configuredEnvironment),
    release: normalizeRelease(configuredRelease),
  }
}

function resolveObservabilityEnvironment(
  mode: string,
  configuredEnvironment?: string | null,
): ObservabilityEnvironment {
  const configured = configuredEnvironment?.trim().toLowerCase()

  if (
    configured === 'local' ||
    configured === 'preview' ||
    configured === 'production'
  ) {
    return configured
  }

  if (mode === 'development') return 'local'
  if (mode === 'production') return 'production'
  return 'preview'
}

function normalizeRelease(value?: string | null): string | undefined {
  const release = value?.trim()
  return release || undefined
}
