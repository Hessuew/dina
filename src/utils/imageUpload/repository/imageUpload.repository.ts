import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { courses, profiles } from '@/db/schema'

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

export async function findCourseForThumbnail(courseId: string) {
  const db = await getDb()
  return db.query.courses.findFirst({
    where: eq(courses.id, courseId),
  })
}

export async function updateCourseThumbnailPath(
  courseId: string,
  thumbnailPath: string,
): Promise<void> {
  const db = await getDb()
  await db
    .update(courses)
    .set({ thumbnailUrl: thumbnailPath, updatedAt: new Date() })
    .where(eq(courses.id, courseId))
}
/* v8 ignore end */
