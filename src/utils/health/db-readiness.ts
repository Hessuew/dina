import { sql } from 'drizzle-orm'

import { getDb, withDbConnection } from '@/db'

export async function checkDatabaseReadiness(): Promise<void> {
  await withDbConnection(async () => {
    const db = await getDb()
    await db.execute(sql`select 1`)
  })
}
