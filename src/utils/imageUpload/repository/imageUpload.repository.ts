import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles } from '@/db/schema'

/* v8 ignore start */
export async function findProfileAvatarPath(
  userId: string,
): Promise<string | null | undefined> {
  const db = await getDb()
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  })
  return profile?.avatarUrl
}

export async function updateProfileAvatarPath(
  userId: string,
  avatarPath: string,
): Promise<void> {
  const db = await getDb()
  await db
    .update(profiles)
    .set({ avatarUrl: avatarPath, updatedAt: new Date() })
    .where(eq(profiles.id, userId))
}

/* v8 ignore end */
