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
import {
  AppError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'
import { getSupabaseAdminClient, getSupabaseServerClient } from '@/utils/supabase'
import { calculateEntityPermissions } from '@/utils/authz/permissions'

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

const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function toFileType(kind: 'youtube' | 'document'): MediaLibraryRow['fileType'] {
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
      throw new NotFoundError('Media not found', {
        details: { mediaId: data.mediaId },
      })
    }

    if (profile.role === 'student' && !row.isPublished) {
      throw new AuthorizationError('Media not available', {
        internalMessage: `Student attempted to view unpublished media: ${data.mediaId}`,
        details: { mediaId: data.mediaId },
      })
    }

    const permissions = calculateEntityPermissions(
      profile.role,
      { teacher1Id: row.uploaderId, teacher2Id: null },
      user.id,
    )

    let viewerUrl: string | null = null
    if (row.fileType === 'document') {
      const supabase = getSupabaseAdminClient()
      const match = row.fileUrl.match(/\/object\/(?:public|sign)\/media-library\/([^?]+)/)
      const filePath = match?.[1]
      if (filePath) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('media-library')
          .createSignedUrl(filePath, 3600)
        if (signedError) {
          console.error('Failed to create signed URL', { filePath, error: signedError.message })
        }
        viewerUrl = signedData?.signedUrl ?? null
      }
    }

    return {
      media: row as MediaLibraryRow,
      viewerUrl,
      permissions,
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
      throw new AuthorizationError('Teacher access required', {
        code: 'ROLE_REQUIRED',
        internalMessage: 'Student attempted to create library media',
        details: { role: profile.role },
      })
    }

    const db = await getDb()

    const [row] = await db
      .insert(mediaLibrary)
      .values({
        uploaderId: user.id,
        courseId: data.courseId ?? null,
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
      throw new AuthorizationError('Teacher access required', {
        code: 'ROLE_REQUIRED',
        internalMessage: 'Student attempted to update library media',
        details: { role: profile.role },
      })
    }

    const db = await getDb()

    const existing = await db.query.mediaLibrary.findFirst({
      where: eq(mediaLibrary.id, data.mediaId),
    })

    if (!existing) {
      throw new NotFoundError('Media not found', {
        details: { mediaId: data.mediaId },
      })
    }

    const canEdit = profile.role === 'admin' || existing.uploaderId === user.id

    if (!canEdit) {
      throw new AuthorizationError('Not authorized to edit this media', {
        internalMessage: `User cannot edit library media: ${data.mediaId}`,
        details: { mediaId: data.mediaId, userId: user.id },
      })
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
      throw new AuthorizationError('Teacher access required', {
        code: 'ROLE_REQUIRED',
        internalMessage: 'Student attempted to delete library media',
        details: { role: profile.role },
      })
    }

    const db = await getDb()

    const existing = await db.query.mediaLibrary.findFirst({
      where: eq(mediaLibrary.id, data.mediaId),
    })

    if (!existing) {
      throw new NotFoundError('Media not found', {
        details: { mediaId: data.mediaId },
      })
    }

    const canDelete =
      profile.role === 'admin' || existing.uploaderId === user.id

    if (!canDelete) {
      throw new AuthorizationError('Not authorized to delete this media', {
        internalMessage: `User cannot delete library media: ${data.mediaId}`,
        details: { mediaId: data.mediaId, userId: user.id },
      })
    }

    await db.delete(mediaLibrary).where(eq(mediaLibrary.id, data.mediaId))

    return { success: true }
  })

export const uploadMediaPdfFn = createServerFn({ method: 'POST' })
  .inputValidator(uploadMediaPdfSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)

    if (profile.role === 'student') {
      throw new AuthorizationError('Teacher access required', {
        code: 'ROLE_REQUIRED',
        internalMessage: 'Student attempted to upload library PDF',
        details: { role: profile.role },
      })
    }

    const supabase = getSupabaseServerClient()
    const maxSize = 25 * 1024 * 1024

    if (data.fileSize > maxSize) {
      throw new ValidationError('File size must be less than 25MB', {
        details: { fileSize: data.fileSize, maxSize },
      })
    }

    if (!DOCUMENT_MIME_TYPES.includes(data.fileType)) {
      throw new ValidationError('Only PDF, PPTX, and DOCX files are allowed', {
        details: { fileType: data.fileType },
      })
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
      throw new AppError({
        code: 'STORAGE_UPLOAD_FAILED',
        status: 502,
        userMessage: 'Failed to upload file',
        internalMessage: uploadError.message,
      })
    }

    const { data: urlData } = supabase.storage
      .from('media-library')
      .getPublicUrl(fileName)

    return {
      success: true,
      fileUrl: urlData.publicUrl,
    }
  })
