import { sql } from 'drizzle-orm'

import { getDb, withDbConnection } from '@/db'

/**
 * Bounded readiness probe. statement_timeout aborts the query server-side when
 * the caller AbortSignal fires (or hard-cap after DEFAULT when no signal).
 */
export async function checkDatabaseReadiness(
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) {
    throw new Error('Readiness check aborted')
  }

  await withDbConnection(async () => {
    if (signal?.aborted) {
      throw new Error('Readiness check aborted')
    }
    const db = await getDb()
    // Cap backend work if the worker times out first (2s matches default probe).
    await db.execute(sql`set local statement_timeout = 2000`)
    await db.execute(sql`select 1`)
  })
}
