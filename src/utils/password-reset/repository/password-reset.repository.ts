import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'

/* v8 ignore start */
export async function findProfileByEmail(email: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: eq(profiles.email, email),
  })
}

export async function findProfileByResetTokenHash(tokenHash: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: eq(profiles.resetTokenHash, tokenHash),
  })
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
  await db.update(profiles).set(values).where(eq(profiles.id, userId))
}

export async function incrementResetTokenAttempts(userId: string) {
  const db = await getDb()
  await db
    .update(profiles)
    .set({
      resetTokenAttempts: sql`${profiles.resetTokenAttempts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
}

export async function clearProfileResetToken(userId: string) {
  const db = await getDb()
  await db
    .update(profiles)
    .set({
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      resetTokenAttempts: 0,
      lastResetRequestAt: null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
}
/* v8 ignore end */
