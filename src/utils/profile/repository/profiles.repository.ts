import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'

/* v8 ignore start */
export async function findProfileById(userId: string) {
  const db = await getDb()
  return db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
    columns: { lastEmailChangeRequestAt: true },
  })
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
  await db
    .update(profiles)
    .set({
      fullName: data.fullName,
      bio: data.bio,
      pendingEmail: data.pendingEmail,
      emailChangeTokenHash: data.emailChangeTokenHash,
      emailChangeTokenExpiresAt: data.emailChangeTokenExpiresAt,
      emailChangeTokenAttempts: 0,
      lastEmailChangeRequestAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
}

export async function clearEmailChangeTokens(userId: string) {
  const db = await getDb()
  await db
    .update(profiles)
    .set({
      pendingEmail: null,
      emailChangeTokenHash: null,
      emailChangeTokenExpiresAt: null,
      emailChangeTokenAttempts: 0,
      lastEmailChangeRequestAt: null,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
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
/* v8 ignore end */
