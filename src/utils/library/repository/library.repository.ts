import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { mediaLibrary } from '@/db/schema'

export type MediaRecord = typeof mediaLibrary.$inferSelect
export type MediaRecordWithCourse = MediaRecord & {
  course?: { id: string; title: string; orderIndex: number | null } | null
}
export type InsertMediaValues = typeof mediaLibrary.$inferInsert

/* v8 ignore start */
export async function findAllMedia(
  studentRole: boolean,
): Promise<Array<MediaRecordWithCourse>> {
  const db = await getDb()
  return db.query.mediaLibrary.findMany({
    where: studentRole ? (t) => eq(t.isPublished, true) : undefined,
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: {
      course: {
        columns: { id: true, title: true, orderIndex: true },
      },
    },
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
