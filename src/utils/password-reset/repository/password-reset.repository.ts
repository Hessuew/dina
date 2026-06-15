import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { accountSecurity, profiles } from '@/db/schema'

/* v8 ignore start */
export async function findProfileByEmail(email: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: eq(profiles.email, email),
    columns: { id: true },
    with: { accountSecurity: { columns: { lastResetRequestAt: true } } },
  })
}

export async function findProfileByResetTokenHash(tokenHash: string) {
  const db = await getDb()
  const row = await db.query.accountSecurity.findFirst({
    where: eq(accountSecurity.resetTokenHash, tokenHash),
  })
  if (!row) return undefined
  return {
    id: row.profileId,
    resetTokenExpiresAt: row.resetTokenExpiresAt,
    resetTokenAttempts: row.resetTokenAttempts,
  }
}

export async function updateProfileResetToken(
  userId: string,
  values: {
    resetTokenHash: string
    resetTokenExpiresAt: Date
    resetTokenAttempts: number
    lastResetRequestAt: Date
    updatedAt: Date
  },
) {
  const db = await getDb()
  await db
    .insert(accountSecurity)
    .values({ profileId: userId, ...values })
    .onConflictDoUpdate({ target: accountSecurity.profileId, set: values })
}

export async function incrementResetTokenAttempts(userId: string) {
  const db = await getDb()
  await db
    .update(accountSecurity)
    .set({
      resetTokenAttempts: sql`${accountSecurity.resetTokenAttempts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(accountSecurity.profileId, userId))
}

export async function clearProfileResetToken(userId: string) {
  const db = await getDb()
  await db
    .update(accountSecurity)
    .set({
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      resetTokenAttempts: 0,
      lastResetRequestAt: null,
      updatedAt: new Date(),
    })
    .where(eq(accountSecurity.profileId, userId))
}
/* v8 ignore end */
