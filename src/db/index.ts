import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { env as _cfEnv } from 'cloudflare:workers'
import * as schema from './schema'

const cfEnv = _cfEnv as any

export function getConnectionString() {
  // Cloudflare (Hyperdrive)
  if (cfEnv.HYPERDRIVE?.connectionString) {
    return cfEnv.HYPERDRIVE.connectionString
  }

  // Local dev (via shim) or plain process.env fallback
  return cfEnv.DATABASE_URL ?? process.env.DATABASE_URL
}

// Reuse a single connection pool instead of opening (and leaking) a new
// connection on every getDb() call. The pool keeps connections warm so each
// query is an instant checkout rather than a fresh TCP+TLS+auth handshake.
// In Workers the module-scoped pool lives for the isolate's lifetime and its
// sockets die with the isolate, so there is no cross-request leak.
let pool: Pool | undefined
let db: ReturnType<typeof drizzle<typeof schema>> | undefined

// Kept async to preserve the existing `await getDb()` call-site signature.
// eslint-disable-next-line @typescript-eslint/require-await
export async function getDb() {
  if (!db) {
    pool = new Pool({ connectionString: getConnectionString() })
    db = drizzle(pool, { schema })
  }
  return db
}
