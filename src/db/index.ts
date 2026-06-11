import { AsyncLocalStorage } from 'node:async_hooks'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
import { env as _cfEnv } from 'cloudflare:workers'
import * as schema from './schema'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

const cfEnv = _cfEnv as any

// Holds the connection opened for the current request, so every getDb() call
// within one request reuses a single connection instead of opening its own.
interface ConnectionStore {
  client?: Client
  db?: NodePgDatabase<typeof schema>
}

const connectionStorage = new AsyncLocalStorage<ConnectionStore>()

function getConnectionString() {
  // Cloudflare (Hyperdrive)
  if (cfEnv.HYPERDRIVE?.connectionString) {
    return cfEnv.HYPERDRIVE.connectionString
  }

  // Local dev (via shim) or plain process.env fallback
  return cfEnv.DATABASE_URL ?? process.env.DATABASE_URL
}

export async function getDb() {
  const store = connectionStorage.getStore()
  if (store?.db) return store.db

  const connectionString = getConnectionString()

  const client = new Client({ connectionString })

  await client.connect()

  const db = drizzle(client, { schema })

  // Inside a request scope: cache for reuse and request-end cleanup.
  // Outside one (loaders, scripts): one-off connection, same as before.
  if (store) {
    store.client = client
    store.db = db
  }

  return db
}

// Runs `fn` within a request scope that shares a single DB connection across
// all getDb() calls, then closes that connection when the request finishes.
// If `fn` never calls getDb(), no connection is opened or closed.
export async function withDbConnection<T>(fn: () => Promise<T>): Promise<T> {
  const store: ConnectionStore = {}
  try {
    return await connectionStorage.run(store, fn)
  } finally {
    if (store.client) {
      await store.client.end()
    }
  }
}
