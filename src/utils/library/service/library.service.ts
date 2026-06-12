import type {
  CreateMediaInput,
  DeleteMediaInput,
  GetMediaInput,
  UpdateMediaInput,
  UploadMediaPdfInput,
  UploadMediaThumbnailInput,
} from '@/schemas/media.schema'
import type { MediaLibraryRow } from '@/utils/library/library'
import type { Role } from '@/utils/authz'
import {
  buildMediaListItems,
  canManageMedia,
  extractPdfFilePath,
  toFileType,
  validatePdfUpload,
} from '@/utils/library/domain/library.domain'
import {
  deleteMedia,
  findAllMedia,
  findMediaById,
  insertMedia,
  updateMedia,
  updateMediaThumbnail,
} from '@/utils/library/repository/library.repository'
import {
  AppError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@/utils/errors'
import { calculateEntityPermissions } from '@/utils/authz/permissions'
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from '@/utils/supabase'
import {
  deleteStorageObject,
  uploadImageService,
} from '@/utils/imageUpload/service/imageUpload.service'
import { extractStorageObjectName } from '@/utils/imageUpload/domain/imageUpload.domain'

export async function getLibraryMediaService(
  userId: string,
  role: Role,
): Promise<{
  media: Array<MediaLibraryRow>
  viewer: { id: string; role: Role }
}> {
  const rows = await findAllMedia(role === 'student')
  const media = buildMediaListItems(rows)
  return { media, viewer: { id: userId, role } }
}

export async function getLibraryMediaItemService(
  data: GetMediaInput,
  userId: string,
  role: Role,
): Promise<{
  media: MediaLibraryRow
  viewerUrl: string | null
  permissions: ReturnType<typeof calculateEntityPermissions>
  viewer: { id: string; role: Role }
}> {
  const row = await findMediaById(data.mediaId)

  if (!row) {
    throw new NotFoundError('Media not found', {
      details: { mediaId: data.mediaId },
    })
  }

  if (role === 'student' && !row.isPublished) {
    throw new AuthorizationError('Media not available', {
      internalMessage: `Student attempted to view unpublished media: ${data.mediaId}`,
      details: { mediaId: data.mediaId },
    })
  }

  const permissions = calculateEntityPermissions(
    role,
    { teacher1Id: row.uploaderId, teacher2Id: null },
    userId,
  )

  let viewerUrl: string | null = null
  if (row.fileType === 'document') {
    const supabase = getSupabaseAdminClient()
    const filePath = extractPdfFilePath(row.fileUrl)
    if (filePath) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from('media-library')
        .createSignedUrl(filePath, 3600)
      if (signedError) {
        console.error('Failed to create signed URL', {
          filePath,
          error: signedError.message,
        })
      }
      viewerUrl = signedData?.signedUrl ?? null
    }
  }

  return {
    media: row as MediaLibraryRow,
    viewerUrl,
    permissions,
    viewer: { id: userId, role },
  }
}

export async function createLibraryMediaService(
  data: CreateMediaInput,
  userId: string,
  role: Role,
): Promise<{ media: MediaLibraryRow }> {
  if (role === 'student') {
    throw new AuthorizationError('Teacher access required', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Student attempted to create library media',
      details: { role },
    })
  }

  const media = await insertMedia({
    uploaderId: userId,
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

  return { media }
}

export async function updateLibraryMediaService(
  data: UpdateMediaInput,
  userId: string,
  role: Role,
): Promise<{ media: MediaLibraryRow }> {
  if (role === 'student') {
    throw new AuthorizationError('Teacher access required', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Student attempted to update library media',
      details: { role },
    })
  }

  const existing = await findMediaById(data.mediaId)

  if (!existing) {
    throw new NotFoundError('Media not found', {
      details: { mediaId: data.mediaId },
    })
  }

  if (!canManageMedia(role, userId, existing.uploaderId)) {
    throw new AuthorizationError('Not authorized to edit this media', {
      internalMessage: `User cannot edit library media: ${data.mediaId}`,
      details: { mediaId: data.mediaId, userId },
    })
  }

  const media = await updateMedia(data.mediaId, {
    title: data.title,
    category: data.category,
    description: data.description ?? null,
    fileUrl: data.url,
    fileType: toFileType(data.kind),
    fileSize: data.fileSize ?? null,
    isPublished: data.isPublished,
    updatedAt: new Date(),
  })

  return { media }
}

export async function deleteLibraryMediaService(
  data: DeleteMediaInput,
  userId: string,
  role: Role,
): Promise<{ success: true }> {
  if (role === 'student') {
    throw new AuthorizationError('Teacher access required', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Student attempted to delete library media',
      details: { role },
    })
  }

  const existing = await findMediaById(data.mediaId)

  if (!existing) {
    throw new NotFoundError('Media not found', {
      details: { mediaId: data.mediaId },
    })
  }

  if (!canManageMedia(role, userId, existing.uploaderId)) {
    throw new AuthorizationError('Not authorized to delete this media', {
      internalMessage: `User cannot delete library media: ${data.mediaId}`,
      details: { mediaId: data.mediaId, userId },
    })
  }

  await deleteMedia(data.mediaId)

  return { success: true }
}

export async function uploadMediaPdfService(
  data: UploadMediaPdfInput,
  userId: string,
  role: Role,
): Promise<{ success: true; fileUrl: string }> {
  if (role === 'student') {
    throw new AuthorizationError('Teacher access required', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Student attempted to upload library PDF',
      details: { role },
    })
  }

  validatePdfUpload(data.fileSize, data.fileType)

  // Derive the previous PDF URL server-side from the media row. Never trust a
  // client-supplied URL here: deletion runs with the RLS-bypassing admin client,
  // so a client value would allow deleting arbitrary media-library objects.
  const existing = data.mediaId ? await findMediaById(data.mediaId) : undefined
  const oldFileUrl = existing?.fileUrl

  const supabase = getSupabaseServerClient()

  const fileExt = data.fileName.split('.').pop() || 'pdf'
  const fileName = `${userId}-${Date.now()}.${fileExt}`
  const commaIndex = data.fileData.indexOf(',')
  const base64Data =
    commaIndex !== -1 ? data.fileData.slice(commaIndex + 1) : data.fileData
  if (!base64Data) {
    throw new ValidationError('Invalid file data: missing base64 content', {
      details: { fileName: data.fileName },
    })
  }
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

  if (oldFileUrl) {
    const oldPath = extractPdfFilePath(oldFileUrl)
    if (oldPath) {
      await deleteStorageObject('media-library', oldPath)
    } else {
      console.warn('Could not extract PDF file path from URL', {
        url: oldFileUrl,
      })
    }
  }

  return { success: true, fileUrl: urlData.publicUrl }
}

export async function uploadMediaThumbnailService(
  data: UploadMediaThumbnailInput,
  userId: string,
  role: Role,
): Promise<{ thumbnailUrl: string }> {
  if (role === 'student') {
    throw new AuthorizationError('Teacher access required', {
      code: 'ROLE_REQUIRED',
      internalMessage: 'Student attempted to upload media thumbnail',
      details: { role },
    })
  }

  const existing = await findMediaById(data.mediaId)

  if (!existing) {
    throw new NotFoundError('Media not found', {
      details: { mediaId: data.mediaId },
    })
  }

  const uploadResult = await uploadImageService(
    {
      fileData: data.fileData,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      bucket: 'media-thumbnails',
    },
    userId,
  )

  await updateMediaThumbnail(data.mediaId, uploadResult.imageUrl)

  if (existing.thumbnailUrl) {
    const oldPath = extractStorageObjectName(existing.thumbnailUrl)
    if (oldPath) {
      await deleteStorageObject('media-thumbnails', oldPath)
    } else {
      console.warn('Could not extract storage object name from URL', {
        url: existing.thumbnailUrl,
      })
    }
  }

  return { thumbnailUrl: uploadResult.imageUrl }
}
