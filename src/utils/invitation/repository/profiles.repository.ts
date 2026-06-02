/* v8 ignore start */
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'

export async function findProfileByEmail(email: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: eq(profiles.email, email),
  })
}
/* v8 ignore end */
