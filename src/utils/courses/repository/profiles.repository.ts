/* v8 ignore start */
import { eq, inArray } from 'drizzle-orm'
import type { getDb } from '@/db'
import { profiles } from '@/db/schema'

type Db = Awaited<ReturnType<typeof getDb>>

export async function findProfileById(db: Db, userId: string) {
  return db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  })
}

export async function findTeachersByIds(db: Db, ids: string[]) {
  return db.query.profiles.findMany({
    where: inArray(profiles.id, ids),
  })
}
/* v8 ignore end */
