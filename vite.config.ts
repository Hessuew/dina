import { URL, fileURLToPath } from 'node:url'
import { createLogger, defineConfig, loadEnv } from 'vite'
import babel from '@rolldown/plugin-babel'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'

import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

import {
  buildResolveAlias,
  isCloudflareMode,
  resolveCloudflareClientShim,
  resolveSentryBuildConfig,
} from './scripts/vite-config.domain.ts'

const config = defineConfig(({ mode }) => {
  const isCloudflare = isCloudflareMode(mode)
  const sentryBuildConfig = resolveSentryBuildConfig(
    loadEnv(mode, process.cwd(), ''),
  )

  const shimPath = fileURLToPath(
    new URL('./src/cloudflare-shim.ts', import.meta.url),
  )

  // Several @tanstack/* dist files reference .map files they don't ship,
  // producing noisy "Failed to load source map" warnings. Filter just those.
  const logger = createLogger()
  const baseWarn = logger.warn
  logger.warn = (msg, options) => {
    if (msg.includes('Failed to load source map')) return
    baseWarn(msg, options)
  }

  return {
    customLogger: logger,
    resolve: {
      tsconfigPaths: true,
      alias: buildResolveAlias(
        fileURLToPath(new URL('./src', import.meta.url)),
        shimPath,
        isCloudflare,
      ),
    },
    plugins: [
      devtools(),
      isCloudflare && cloudflare({ viteEnvironment: { name: 'ssr' } }),
      isCloudflare && {
        name: 'cloudflare-workers-client-shim',
        enforce: 'pre' as const,
        resolveId(
          id: string,
          _importer: string | undefined,
          opts: { ssr?: boolean },
        ) {
          return resolveCloudflareClientShim(id, opts.ssr, shimPath)
        },
      },
      tailwindcss(),
      tanstackStart(),
      ...(sentryBuildConfig ? [sentryTanstackStart(sentryBuildConfig)] : []),
      viteReact(),
      babel({ presets: [reactCompilerPreset()] }),
    ].filter(Boolean),
  }
})

export default config
