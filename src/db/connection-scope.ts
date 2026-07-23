import { AsyncLocalStorage } from 'node:async_hooks'

export type EndableClient = { end: () => Promise<void> }

export type ConnectionResources<TDb, TClient extends EndableClient> = {
  client: TClient
  db: TDb
}

export type OpenConnection<TDb, TClient extends EndableClient> = () => Promise<
  ConnectionResources<TDb, TClient>
>

type ConnectionStore<TDb, TClient extends EndableClient> = {
  client?: TClient
  db?: TDb
  /** In-flight open so parallel getDb() share one connect. */
  connectPromise?: Promise<TDb>
}

/**
 * Request-scoped DB access for Cloudflare Workers + Hyperdrive.
 *
 * - One logical client per request scope (`withDbConnection`).
 * - Parallel first-touch `getDb()` calls share a single in-flight open.
 * - Nested `withDbConnection` is a no-op (outer owns end()).
 * - Outside a scope, `getDb()` still opens a one-off connection (scripts/loaders).
 */
export function createConnectionScope<TDb, TClient extends EndableClient>(
  open: OpenConnection<TDb, TClient>,
) {
  const storage = new AsyncLocalStorage<ConnectionStore<TDb, TClient>>()

  async function openAndCache(
    store: ConnectionStore<TDb, TClient> | undefined,
  ): Promise<TDb> {
    const { client, db } = await open()
    if (store) {
      store.client = client
      store.db = db
    }
    return db
  }

  async function getDb(): Promise<TDb> {
    const store = storage.getStore()
    if (store?.db) return store.db
    if (store?.connectPromise) return store.connectPromise

    const promise = openAndCache(store)
    if (store) {
      store.connectPromise = promise
      void promise.catch(() => {
        if (store.connectPromise === promise) {
          store.connectPromise = undefined
        }
      })
    }
    return promise
  }

  async function withDbConnection<T>(fn: () => Promise<T>): Promise<T> {
    if (storage.getStore()) return fn()

    const store: ConnectionStore<TDb, TClient> = {}
    try {
      return await storage.run(store, fn)
    } finally {
      if (store.client) {
        await store.client.end()
      }
    }
  }

  return { getDb, withDbConnection }
}
