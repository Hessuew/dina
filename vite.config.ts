import { URL, fileURLToPath } from 'node:url'
import { createLogger, defineConfig, loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'

import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

import {
  buildResolveAlias,
  isCloudflareMode,
  resolveCloudflareClientShim,
} from './scripts/vite-config.domain.ts'

const config = defineConfig(({ mode }) => {
  const isCloudflare = isCloudflareMode(mode)
  const sentryAuthToken = loadEnv(mode, process.cwd(), '').SENTRY_AUTH_TOKEN

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
      // this is the plugin that enables path aliases
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
      tanstackStart(),
      ...(sentryAuthToken
        ? [
            sentryTanstackStart({
              org: 'cherubim-it',
              project: 'dina',
              authToken: sentryAuthToken,
            }),
          ]
        : []),
      viteReact({
        babel: {
          plugins: ['babel-plugin-react-compiler'],
        },
      }),
    ].filter(Boolean),
  }
})

export default config
