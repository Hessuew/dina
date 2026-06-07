// Integration-test stand-in for `@/db`. The integration Vitest config aliases
// the exact specifier `@/db` to this module, so every repository's
// `import { getDb } from '@/db'` transparently talks to an in-memory PGlite
// instance instead of Cloudflare Hyperdrive. Production `src/db/index.ts` is
// untouched (and its `cloudflare:workers` import never enters the test graph).
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '@/db/schema'

// One PGlite per worker. Vitest isolates each test file in its own module graph,
// so each integration test file gets its own fresh database. pg_trgm is loaded
// so the trigram GIN index migrations parse (Supabase has it enabled in prod).
const client = new PGlite({ extensions: { pg_trgm } })
const db = drizzle(client, { schema })

export function getDb() {
  return db
}

// Surface parity with `@/db` — some callers import this alongside getDb.
export function getConnectionString() {
  return 'pglite://memory'
}

// Raw client, used by the setup file to run the prelude + migrations.
export function getPgliteClient() {
  return client
}

// Wipe all public tables between tests. The drizzle bookkeeping table lives in
// the `drizzle` schema, so restricting to `public` leaves migrations intact.
export async function truncateAll() {
  const { rows } = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  )
  if (rows.length === 0) return
  const names = rows.map((r) => `"public"."${r.tablename}"`).join(', ')
  await client.exec(`TRUNCATE ${names} RESTART IDENTITY CASCADE;`)
}
