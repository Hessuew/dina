import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import type { MediaLibraryRow } from '@/utils/library/library'
import { mediaLibrary } from '@/db/schema'

export async function seedMedia(overrides: {
  id?: string
  uploaderId: string
  courseId?: string
  title?: string
  category?: string
  description?: string
  fileUrl?: string
  fileType?: MediaLibraryRow['fileType']
  fileSize?: number
  thumbnailUrl?: string
  isPublished?: boolean
}): Promise<string> {
  const id = overrides.id ?? randomUUID()
  const db = await getDb()
  await db.insert(mediaLibrary).values({
    id,
    uploaderId: overrides.uploaderId,
    title: overrides.title ?? 'Test Media',
    fileUrl: overrides.fileUrl ?? 'https://example.test/media/file.mp4',
    fileType: overrides.fileType ?? 'video',
    ...(overrides.courseId !== undefined
      ? { courseId: overrides.courseId }
      : {}),
    ...(overrides.category !== undefined
      ? { category: overrides.category }
      : {}),
    ...(overrides.description !== undefined
      ? { description: overrides.description }
      : {}),
    ...(overrides.fileSize !== undefined
      ? { fileSize: overrides.fileSize }
      : {}),
    ...(overrides.thumbnailUrl !== undefined
      ? { thumbnailUrl: overrides.thumbnailUrl }
      : {}),
    ...(overrides.isPublished !== undefined
      ? { isPublished: overrides.isPublished }
      : {}),
  })
  return id
}
