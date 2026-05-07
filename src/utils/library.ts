import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { mediaLibrary } from '@/db/schema'
import {
  createMediaSchema,
  deleteMediaSchema,
  getMediaSchema,
  updateMediaSchema,
  uploadMediaPdfSchema,
} from '@/schemas/media.schema'
import { getCurrentUser, getUserProfile } from '@/utils/auth/auth'
import { getSupabaseServerClient } from '@/utils/supabase'

export type MediaLibraryRow = {
  id: string
  uploaderId: string
  courseId: string | null
  title: string
  category: string
  description: string | null
  fileUrl: string
  fileType: 'video' | 'audio' | 'document' | 'image' | 'other'
  fileSize: number | null
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
}

function toFileType(kind: 'youtube' | 'pdf'): MediaLibraryRow['fileType'] {
  return kind === 'youtube' ? 'video' : 'document'
}

export const getLibraryMedia = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)
    const db = await getDb()

    const rows = await db.query.mediaLibrary.findMany({
      where:
        profile.role === 'student' ? (t) => eq(t.isPublished, true) : undefined,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })

    return {
      media: rows as Array<MediaLibraryRow>,
      viewer: {
        id: user.id,
        role: profile.role,
      },
    }
  },
)

export const getLibraryMediaItem = createServerFn({ method: 'POST' })
  .inputValidator(getMediaSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)
    const db = await getDb()

    const row = await db.query.mediaLibrary.findFirst({
      where: eq(mediaLibrary.id, data.mediaId),
    })

    if (!row) {
      throw new Error('Media not found')
    }

    if (profile.role === 'student' && !row.isPublished) {
      throw new Error('Media not available')
    }

    return {
      media: row as MediaLibraryRow,
      viewer: {
        id: user.id,
        role: profile.role,
      },
    }
  })

export const createLibraryMedia = createServerFn({ method: 'POST' })
  .inputValidator(createMediaSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)

    if (profile.role === 'student') {
      throw new Error('Teacher access required')
    }

    const db = await getDb()

    const [row] = await db
      .insert(mediaLibrary)
      .values({
        uploaderId: user.id,
        courseId: null,
        title: data.title,
        category: data.category,
        description: data.description ?? null,
        fileUrl: data.url,
        fileType: toFileType(data.kind),
        fileSize: data.fileSize ?? null,
        isPublished: data.isPublished,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return { media: row as MediaLibraryRow }
  })

export const updateLibraryMedia = createServerFn({ method: 'POST' })
  .inputValidator(updateMediaSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)

    if (profile.role === 'student') {
      throw new Error('Teacher access required')
    }

    const db = await getDb()

    const existing = await db.query.mediaLibrary.findFirst({
      where: eq(mediaLibrary.id, data.mediaId),
    })

    if (!existing) {
      throw new Error('Media not found')
    }

    const canEdit = profile.role === 'admin' || existing.uploaderId === user.id

    if (!canEdit) {
      throw new Error('Not authorized to edit this media')
    }

    const [row] = await db
      .update(mediaLibrary)
      .set({
        title: data.title,
        category: data.category,
        description: data.description ?? null,
        fileUrl: data.url,
        fileType: toFileType(data.kind),
        fileSize: data.fileSize ?? null,
        isPublished: data.isPublished,
        updatedAt: new Date(),
      })
      .where(eq(mediaLibrary.id, data.mediaId))
      .returning()

    return { media: row as MediaLibraryRow }
  })

export const deleteLibraryMedia = createServerFn({ method: 'POST' })
  .inputValidator(deleteMediaSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)

    if (profile.role === 'student') {
      throw new Error('Teacher access required')
    }

    const db = await getDb()

    const existing = await db.query.mediaLibrary.findFirst({
      where: eq(mediaLibrary.id, data.mediaId),
    })

    if (!existing) {
      throw new Error('Media not found')
    }

    const canDelete =
      profile.role === 'admin' || existing.uploaderId === user.id

    if (!canDelete) {
      throw new Error('Not authorized to delete this media')
    }

    await db.delete(mediaLibrary).where(eq(mediaLibrary.id, data.mediaId))

    return { success: true }
  })

export const uploadMediaPdfFn = createServerFn({ method: 'POST' })
  .inputValidator(uploadMediaPdfSchema)
  .handler(async ({ data }) => {
    try {
      const user = await getCurrentUser()
      const profile = await getUserProfile(user.id)

      if (profile.role === 'student') {
        return {
          error: true,
          message: 'Teacher access required',
        }
      }
      const supabase = getSupabaseServerClient()

      const maxSize = 25 * 1024 * 1024
      if (data.fileSize > maxSize) {
        return {
          error: true,
          message: 'File size must be less than 25MB',
        }
      }

      if (data.fileType !== 'application/pdf') {
        return {
          error: true,
          message: 'Only PDF files are allowed',
        }
      }

      if (data.oldUrl) {
        const oldPath = data.oldUrl.split('/').pop()
        if (oldPath) {
          const { error: deleteError } = await supabase.storage
            .from('media-library')
            .remove([oldPath])
          if (deleteError) {
            console.log('⚠️ Failed to delete old PDF', {
              error: deleteError,
            })
          }
        }
      }

      const fileExt = data.fileName.split('.').pop() || 'pdf'
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      const base64Data = data.fileData.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')

      const { error: uploadError } = await supabase.storage
        .from('media-library')
        .upload(fileName, buffer, {
          contentType: data.fileType,
          upsert: false,
        })

      if (uploadError) {
        return {
          error: true,
          message: uploadError.message,
        }
      }

      const { data: urlData } = supabase.storage
        .from('media-library')
        .getPublicUrl(fileName)

      return {
        success: true,
        fileUrl: urlData.publicUrl,
      }
    } catch (error) {
      console.error('❌ Unexpected error in uploadMediaPdfFn:', error)
      return {
        error: true,
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      }
    }
  })
