/* v8 ignore start */
import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { mediaLibrary } from '@/db/schema'

export type MediaRecord = typeof mediaLibrary.$inferSelect
export type InsertMediaValues = typeof mediaLibrary.$inferInsert

export async function findAllMedia(studentOnly: boolean) {
  const db = await getDb()
  return db.query.mediaLibrary.findMany({
    where: studentOnly ? eq(mediaLibrary.isPublished, true) : undefined,
    orderBy: (media, { desc }) => [desc(media.createdAt)],
  })
}

export async function findMediaById(
  mediaId: string,
): Promise<MediaRecord | undefined> {
  const db = await getDb()
  return db.query.mediaLibrary.findFirst({
    where: eq(mediaLibrary.id, mediaId),
  })
}

export async function findCourseMediaRows(
  courseIds: Array<string>,
  includeUnpublished: boolean,
) {
  if (courseIds.length === 0) return []
  const db = await getDb()
  const courseFilter = inArray(mediaLibrary.courseId, courseIds)
  return db.query.mediaLibrary.findMany({
    where: includeUnpublished
      ? courseFilter
      : and(courseFilter, eq(mediaLibrary.isPublished, true)),
    orderBy: (media, { desc }) => [desc(media.createdAt)],
  })
}

export async function insertMedia(
  values: InsertMediaValues,
): Promise<MediaRecord> {
  const db = await getDb()
  const [row] = await db.insert(mediaLibrary).values(values).returning()
  return row
}

export async function updateMedia(
  mediaId: string,
  values: Partial<InsertMediaValues>,
): Promise<MediaRecord> {
  const db = await getDb()
  const [row] = await db
    .update(mediaLibrary)
    .set(values)
    .where(eq(mediaLibrary.id, mediaId))
    .returning()
  return row
}

export async function deleteMedia(mediaId: string): Promise<void> {
  const db = await getDb()
  await db.delete(mediaLibrary).where(eq(mediaLibrary.id, mediaId))
}

export async function updateMediaThumbnailPath(
  mediaId: string,
  thumbnailPath: string,
): Promise<void> {
  const db = await getDb()
  await db
    .update(mediaLibrary)
    .set({ thumbnailUrl: thumbnailPath, updatedAt: new Date() })
    .where(eq(mediaLibrary.id, mediaId))
}
/* v8 ignore end */
