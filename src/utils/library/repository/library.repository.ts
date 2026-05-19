import { eq } from 'drizzle-orm'
import type { MediaLibraryRow } from '@/utils/library/library'
import { getDb } from '@/db'
import { mediaLibrary } from '@/db/schema'

type RawMediaRow = MediaLibraryRow & {
  course?: { id: string; title: string; orderIndex: number } | null
}

type InsertMediaValues = {
  uploaderId: string
  courseId: string | null
  title: string
  category: string
  description: string | null
  fileUrl: string
  fileType: MediaLibraryRow['fileType']
  fileSize: number | null
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
}

type UpdateMediaValues = {
  title: string
  category: string
  description: string | null
  fileUrl: string
  fileType: MediaLibraryRow['fileType']
  fileSize: number | null
  isPublished: boolean
  updatedAt: Date
}

/* v8 ignore start */
export async function findAllMedia(
  studentRole: boolean,
): Promise<Array<RawMediaRow>> {
  const db = await getDb()
  return db.query.mediaLibrary.findMany({
    where: studentRole ? (t) => eq(t.isPublished, true) : undefined,
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: {
      course: {
        columns: {
          id: true,
          title: true,
          orderIndex: true,
        },
      },
    },
  }) as Promise<Array<RawMediaRow>>
}

export async function findMediaById(mediaId: string) {
  const db = await getDb()
  return db.query.mediaLibrary.findFirst({
    where: eq(mediaLibrary.id, mediaId),
  })
}

export async function insertMedia(
  values: InsertMediaValues,
): Promise<MediaLibraryRow> {
  const db = await getDb()
  const [row] = await db.insert(mediaLibrary).values(values).returning()
  return row
}

export async function updateMedia(
  mediaId: string,
  values: UpdateMediaValues,
): Promise<MediaLibraryRow> {
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

export async function updateMediaThumbnail(
  mediaId: string,
  thumbnailUrl: string,
): Promise<void> {
  const db = await getDb()
  await db
    .update(mediaLibrary)
    .set({ thumbnailUrl, updatedAt: new Date() })
    .where(eq(mediaLibrary.id, mediaId))
}
/* v8 ignore end */
