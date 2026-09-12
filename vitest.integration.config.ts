import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // Exact `@/db` -> PGlite test double, `@/env` -> dummy config (keeps the
    // `cloudflare:workers` import + t3-env validation out of the test graph).
    // `@/db/schema` and every other `@/` path still resolve via Vite's tsconfig path support.
    alias: [
      {
        find: /^@\/db$/,
        replacement: fileURLToPath(
          new URL('./test/integration/db.ts', import.meta.url),
        ),
      },
      {
        find: /^@\/env$/,
        replacement: fileURLToPath(
          new URL('./test/integration/env.ts', import.meta.url),
        ),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    setupFiles: ['./test/integration/setup.ts'],
    // No coverage block: the 100% gate stays scoped to the unit project.
  },
})
