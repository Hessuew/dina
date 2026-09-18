import { getDb } from '@/db'
import {
  clearEmailChangeTokensInTransaction,
  completeEmailChangeInTransaction,
  updateProfileWithEmailChangeInTransaction,
  upsertEmailChangeTokensInTransaction,
} from '@/utils/repository'

/* v8 ignore start */
type ProfileUpdate = Parameters<
  typeof updateProfileWithEmailChangeInTransaction
>[2]
type EmailChangeTokenValues = Parameters<
  typeof upsertEmailChangeTokensInTransaction
>[2]

/** Persists the profile update and pending email-change token atomically. */
export async function requestEmailChange(
  userId: string,
  profile: ProfileUpdate,
  token: EmailChangeTokenValues,
): Promise<void> {
  const db = await getDb()
  await db.transaction(async (tx) => {
    await updateProfileWithEmailChangeInTransaction(tx, userId, profile)
    await upsertEmailChangeTokensInTransaction(tx, userId, token)
  })
}

/** Commits the profile email and clears its pending change state atomically. */
export async function completeEmailChange(
  userId: string,
  newEmail: string,
): Promise<void> {
  const db = await getDb()
  await db.transaction(async (tx) => {
    await completeEmailChangeInTransaction(tx, userId, newEmail)
    await clearEmailChangeTokensInTransaction(tx, userId)
  })
}
/* v8 ignore end */
