/* v8 ignore start */
import { inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'

export async function findTeachersByIds(ids: Array<string>) {
  const db = await getDb()
  return db.query.profiles.findMany({
    where: inArray(profiles.id, ids),
  })
}
/* v8 ignore end */
