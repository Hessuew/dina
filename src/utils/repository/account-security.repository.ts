import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { accountSecurity } from '@/db/schema'

export type AccountSecurityTransactionClient = Parameters<
  Parameters<Awaited<ReturnType<typeof getDb>>['transaction']>[0]
>[0]

/* v8 ignore start */
export async function findLastEmailChangeRequestAt(userId: string) {
  const db = await getDb()
  const row = await db.query.accountSecurity.findFirst({
    where: eq(accountSecurity.profileId, userId),
    columns: { lastEmailChangeRequestAt: true },
  })
  return row?.lastEmailChangeRequestAt ?? null
}

export async function findEmailChangeToken(tokenHash: string) {
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

export async function upsertEmailChangeTokensInTransaction(
  tx: AccountSecurityTransactionClient,
  userId: string,
  values: {
    pendingEmail: string
    emailChangeTokenHash: string
    emailChangeTokenExpiresAt: Date
  },
) {
  const tokenValues = {
    ...values,
    emailChangeTokenAttempts: 0,
    lastEmailChangeRequestAt: new Date(),
    updatedAt: new Date(),
  }
  await tx
    .insert(accountSecurity)
    .values({ profileId: userId, ...tokenValues })
    .onConflictDoUpdate({
      target: accountSecurity.profileId,
      set: tokenValues,
    })
}

export async function clearEmailChangeTokens(userId: string) {
  const db = await getDb()
  await clearEmailChangeTokensInTransaction(db, userId)
}

export async function clearEmailChangeTokensInTransaction(
  tx: AccountSecurityTransactionClient | Awaited<ReturnType<typeof getDb>>,
  userId: string,
) {
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

export async function findResetToken(tokenHash: string) {
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

export async function upsertResetToken(
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

export async function clearResetToken(userId: string) {
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
