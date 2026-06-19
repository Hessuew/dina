import type {
  UploadAvatarInput,
  UploadCourseThumbnailInput,
  UploadImageInput,
} from '@/schemas/image.schema'
import { AppError, NotFoundError } from '@/utils/errors'
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from '@/utils/supabase'
import {
  decodeBase64DataUrl,
  extractStorageObjectName,
  resolveFileExtension,
  validateImageUpload,
} from '@/utils/imageUpload/domain/imageUpload.domain'
import {
  findCourseForThumbnail,
  findProfileAvatarUrl,
  updateCourseThumbnail,
  updateProfileAvatar,
} from '@/utils/imageUpload/repository/imageUpload.repository'

// Best-effort delete of a previous storage object. Uses the service-role admin
// client to bypass Storage RLS (the RLS-bound user client silently fails to
// delete, orphaning old files). Never throws — a failed cleanup must not break
// the upload that already succeeded.
export async function deleteStorageObject(
  bucket: string,
  objectPath: string,
): Promise<void> {
  const admin = getSupabaseAdminClient()
  const { data: removed, error } = await admin.storage
    .from(bucket)
    .remove([objectPath])
  if (error || !removed.length) {
    console.error('Failed to delete old storage object', {
      bucket,
      objectPath,
      error,
    })
  }
}

export async function uploadImageService(
  data: UploadImageInput,
  userId: string,
): Promise<{ imageUrl: string }> {
  validateImageUpload(data.fileSize, data.fileType)

  const supabase = getSupabaseServerClient()

  const buffer = decodeBase64DataUrl(data.fileData)

  const fileExt = resolveFileExtension(data.fileType, data.fileName)
  const finalFileName = `${userId}-${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from(data.bucket)
    .upload(finalFileName, buffer, {
      contentType: data.fileType,
      upsert: false,
    })

  if (uploadError) {
    throw new AppError({
      code: 'STORAGE_UPLOAD_FAILED',
      status: 500,
      userMessage: uploadError.message,
      internalMessage: `Supabase storage error: ${uploadError.message}`,
    })
  }

  const { data: urlData } = supabase.storage
    .from(data.bucket)
    .getPublicUrl(finalFileName)

  return {
    imageUrl: urlData.publicUrl,
  }
}

export async function uploadAvatarService(
  data: UploadAvatarInput,
  userId: string,
): Promise<{ avatarUrl: string }> {
  const oldAvatarUrl = await findProfileAvatarUrl(userId)

  const uploadResult = await uploadImageService(
    {
      fileData: data.fileData,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      bucket: 'avatars',
    },
    userId,
  )

  await updateProfileAvatar(userId, uploadResult.imageUrl)

  if (oldAvatarUrl) {
    const oldPath = extractStorageObjectName(oldAvatarUrl)
    if (oldPath) {
      await deleteStorageObject('avatars', oldPath)
    } else {
      console.warn('Could not extract storage object name from URL', {
        url: oldAvatarUrl,
      })
    }
  }

  return {
    avatarUrl: uploadResult.imageUrl,
  }
}

export async function uploadCourseThumbnailService(
  data: UploadCourseThumbnailInput,
  userId: string,
): Promise<{ thumbnailUrl: string }> {
  const course = await findCourseForThumbnail(data.courseId)

  if (!course) {
    throw new NotFoundError('Course not found', {
      code: 'COURSE_NOT_FOUND',
      details: { courseId: data.courseId },
    })
  }

  const uploadResult = await uploadImageService(
    {
      fileData: data.fileData,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      bucket: 'course-thumbnails',
    },
    userId,
  )

  await updateCourseThumbnail(data.courseId, uploadResult.imageUrl)

  if (course.thumbnailUrl) {
    const oldPath = extractStorageObjectName(course.thumbnailUrl)
    if (oldPath) {
      await deleteStorageObject('course-thumbnails', oldPath)
    } else {
      console.warn('Could not extract storage object name from URL', {
        url: course.thumbnailUrl,
      })
    }
  }

  return {
    thumbnailUrl: uploadResult.imageUrl,
  }
}
