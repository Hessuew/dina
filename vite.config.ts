import { URL, fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'

import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

const config = defineConfig(({ mode }) => {
  const isCloudflare = mode === 'cf' || mode === 'production'

  const shimPath = fileURLToPath(
    new URL('./src/cloudflare-shim.ts', import.meta.url),
  )

  return {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        ...(!isCloudflare && {
          'cloudflare:workers': shimPath,
        }),
      },
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
          if (id === 'cloudflare:workers' && !opts.ssr) {
            return shimPath
          }
        },
      },
      // this is the plugin that enables path aliases
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
      tanstackStart(),
      viteReact({
        babel: {
          plugins: ['babel-plugin-react-compiler'],
        },
      }),
    ].filter(Boolean),
  }
})

export default config
