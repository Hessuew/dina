import { randomUUID } from 'node:crypto'
import { getDb } from 'test/integration/db'
import type { MediaLibraryRow } from '@/utils/library/library'
import { mediaLibrary } from '@/db/schema'
import { extractPrivateStoragePath } from '@/utils/storage/domain/private-storage.domain'

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
  const fileType = overrides.fileType ?? 'video'
  const source = overrides.fileUrl ?? 'https://youtube.com/watch?v=test'
  const db = await getDb()
  await db.insert(mediaLibrary).values({
    id,
    uploaderId: overrides.uploaderId,
    title: overrides.title ?? 'Test Media',
    externalUrl: fileType === 'video' ? source : null,
    filePath:
      fileType === 'video'
        ? null
        : (extractPrivateStoragePath(source, 'media-library') ?? source),
    fileType,
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
      ? {
          thumbnailUrl:
            extractPrivateStoragePath(
              overrides.thumbnailUrl,
              'media-thumbnails',
            ) ?? overrides.thumbnailUrl,
        }
      : {}),
    ...(overrides.isPublished !== undefined
      ? { isPublished: overrides.isPublished }
      : {}),
  })
  return id
}
