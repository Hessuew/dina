import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { accountSecurity, profiles } from '@/db/schema'

/* v8 ignore start */
export async function findLastEmailChangeRequestAt(userId: string) {
  const db = await getDb()
  const row = await db.query.accountSecurity.findFirst({
    where: eq(accountSecurity.profileId, userId),
    columns: { lastEmailChangeRequestAt: true },
  })
  return row?.lastEmailChangeRequestAt ?? null
}

export async function updateProfileWithEmailChange(
  userId: string,
  data: {
    fullName: string
    bio: string | null
    pendingEmail: string
    emailChangeTokenHash: string
    emailChangeTokenExpiresAt: Date
  },
) {
  const db = await getDb()
  const tokenValues = {
    pendingEmail: data.pendingEmail,
    emailChangeTokenHash: data.emailChangeTokenHash,
    emailChangeTokenExpiresAt: data.emailChangeTokenExpiresAt,
    emailChangeTokenAttempts: 0,
    lastEmailChangeRequestAt: new Date(),
    updatedAt: new Date(),
  }
  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({ fullName: data.fullName, bio: data.bio, updatedAt: new Date() })
      .where(eq(profiles.id, userId))
    await tx
      .insert(accountSecurity)
      .values({ profileId: userId, ...tokenValues })
      .onConflictDoUpdate({
        target: accountSecurity.profileId,
        set: tokenValues,
      })
  })
}

export async function clearEmailChangeTokens(userId: string) {
  const db = await getDb()
  await db
    .update(accountSecurity)
    .set({
      pendingEmail: null,
      emailChangeTokenHash: null,
      emailChangeTokenExpiresAt: null,
      emailChangeTokenAttempts: 0,
      lastEmailChangeRequestAt: null,
      updatedAt: new Date(),
    })
    .where(eq(accountSecurity.profileId, userId))
}

export async function updateProfileBasic(
  userId: string,
  data: {
    fullName: string
    bio: string | null
  },
) {
  const db = await getDb()
  await db
    .update(profiles)
    .set({
      fullName: data.fullName,
      bio: data.bio,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
}

export async function findProfileByEmailChangeToken(tokenHash: string) {
  const db = await getDb()
  const row = await db.query.accountSecurity.findFirst({
    where: eq(accountSecurity.emailChangeTokenHash, tokenHash),
  })
  if (!row) return undefined
  return {
    id: row.profileId,
    pendingEmail: row.pendingEmail,
    emailChangeTokenExpiresAt: row.emailChangeTokenExpiresAt,
    emailChangeTokenAttempts: row.emailChangeTokenAttempts,
  }
}

export async function incrementEmailChangeAttempts(userId: string) {
  const db = await getDb()
  await db
    .update(accountSecurity)
    .set({
      emailChangeTokenAttempts: sql`${accountSecurity.emailChangeTokenAttempts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(accountSecurity.profileId, userId))
}

export async function completeEmailChange(userId: string, newEmail: string) {
  const db = await getDb()
  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({ email: newEmail, updatedAt: new Date() })
      .where(eq(profiles.id, userId))
    await tx
      .update(accountSecurity)
      .set({
        pendingEmail: null,
        emailChangeTokenHash: null,
        emailChangeTokenExpiresAt: null,
        emailChangeTokenAttempts: 0,
        lastEmailChangeRequestAt: null,
        updatedAt: new Date(),
      })
      .where(eq(accountSecurity.profileId, userId))
  })
}
/* v8 ignore end */
