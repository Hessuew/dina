import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'
import {
  clearEmailChangeTokensInTransaction,
  upsertEmailChangeTokensInTransaction,
} from '@/utils/repository/account-security.repository'

/* v8 ignore start */
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
  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({ fullName: data.fullName, bio: data.bio, updatedAt: new Date() })
      .where(eq(profiles.id, userId))
    await upsertEmailChangeTokensInTransaction(tx, userId, {
      pendingEmail: data.pendingEmail,
      emailChangeTokenHash: data.emailChangeTokenHash,
      emailChangeTokenExpiresAt: data.emailChangeTokenExpiresAt,
    })
  })
}

export async function completeEmailChange(userId: string, newEmail: string) {
  const db = await getDb()
  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({ email: newEmail, updatedAt: new Date() })
      .where(eq(profiles.id, userId))
    await clearEmailChangeTokensInTransaction(tx, userId)
  })
}
/* v8 ignore end */
