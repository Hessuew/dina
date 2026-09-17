import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'

/* v8 ignore start */
export async function findProfileByEmail(email: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: eq(profiles.email, email),
    columns: { id: true },
    with: { accountSecurity: { columns: { lastResetRequestAt: true } } },
  })
}

/* v8 ignore end */
