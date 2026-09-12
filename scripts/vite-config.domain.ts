// Pure view-model logic for vite.config.ts, extracted so the config callback
// stays an orchestration shell (CRAP paydown — ADR 0010).

/** Cloudflare is the build target for the `cf` and `production` modes. */
export function isCloudflareMode(mode: string | undefined): boolean {
  return mode === 'cf' || mode === 'production'
}

/**
 * Resolve aliases: `@` always points at the src root; the
 * `cloudflare:workers` shim is aliased only when *not* building for Cloudflare
 * (the real runtime module is available there, so no shim is needed).
 */
export function buildResolveAlias(
  srcPath: string,
  shimPath: string,
  isCloudflare: boolean,
): Record<string, string> {
  return {
    '@': srcPath,
    ...(!isCloudflare && { 'cloudflare:workers': shimPath }),
  }
}

/**
 * Client-side requests for `cloudflare:workers` resolve to the shim; SSR
 * requests (and any other id) fall through to the default resolver.
 */
export function resolveCloudflareClientShim(
  id: string,
  ssr: boolean | undefined,
  shimPath: string,
): string | undefined {
  if (id === 'cloudflare:workers' && !ssr) {
    return shimPath
  }
  return undefined
}

export type SentryBuildConfig = {
  org: string
  project: string
  authToken: string
  sentryUrl?: string
  release?: { name: string }
}

export function resolveSentryBuildConfig(
  values: Partial<Record<string, string>>,
): SentryBuildConfig | null {
  const authToken = values.SENTRY_AUTH_TOKEN?.trim()
  const org = values.SENTRY_ORG?.trim()
  const project = values.SENTRY_PROJECT?.trim()

  if (!authToken || !org || !project) return null

  const sentryUrl = values.SENTRY_URL?.trim()
  const release =
    values.SENTRY_RELEASE?.trim() || values.VITE_SENTRY_RELEASE?.trim()

  return {
    authToken,
    org,
    project,
    ...(sentryUrl ? { sentryUrl } : {}),
    ...(release ? { release: { name: release } } : {}),
  }
}
