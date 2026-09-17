import { eq } from 'drizzle-orm'
import type { MediaRecord } from '@/utils/repository/media-library.repository'
import { getDb } from '@/db'
import { mediaLibrary } from '@/db/schema'

export type MediaRecordWithCourse = MediaRecord & {
  course?: { id: string; title: string; orderIndex: number | null } | null
}

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

/* v8 ignore end */
