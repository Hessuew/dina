import { drizzle } from 'drizzle-orm/node-postgres'
import { Client } from 'pg'
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

export async function getDb() {
  const connectionString = getConnectionString()

  const client = new Client({ connectionString })

  await client.connect()

  const db = drizzle(client, { schema })
  return db
}
