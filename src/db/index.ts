import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import { env as _cfEnv } from 'cloudflare:workers'
import * as schema from './schema'
import { createConnectionScope } from './connection-scope'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

const cfEnv = _cfEnv as any

type AppDb = NodePgDatabase<typeof schema>

function getConnectionString() {
  // Cloudflare (Hyperdrive)
  if (cfEnv.HYPERDRIVE?.connectionString) {
    return cfEnv.HYPERDRIVE.connectionString
  }

  // Local dev (via shim) or plain process.env fallback
  return cfEnv.DATABASE_URL ?? process.env.DATABASE_URL
}

const scope = createConnectionScope<AppDb, Client>(async () => {
  const client = new Client({ connectionString: getConnectionString() })
  await client.connect()
  return { client, db: drizzle(client, { schema }) }
})

/** Drizzle instance for the current request (or a one-off outside a scope). */
export async function getDb() {
  return scope.getDb()
}

/**
 * Runs `fn` in a request scope that shares one DB connection across all
 * `getDb()` calls, then closes that connection when `fn` finishes. Nested
 * calls re-enter the outer scope. Opens nothing if `fn` never calls `getDb()`.
 * Global Start request-scope middleware applies this automatically.
 */
export async function withDbConnection<T>(fn: () => Promise<T>): Promise<T> {
  return scope.withDbConnection(fn)
}
