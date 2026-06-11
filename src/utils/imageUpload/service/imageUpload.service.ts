import sharp from 'sharp'
import type {
  UploadAvatarInput,
  UploadCourseThumbnailInput,
  UploadImageInput,
} from '@/schemas/image.schema'
import { AppError, NotFoundError } from '@/utils/errors'
import { getSupabaseServerClient } from '@/utils/supabase'
import {
  decodeBase64DataUrl,
  extractStorageObjectName,
  resolveFileExtension,
  shouldConvertToWebP,
  validateImageUpload,
} from '@/utils/imageUpload/domain/imageUpload.domain'
import {
  findCourseForThumbnail,
  findProfileAvatarUrl,
  updateCourseThumbnail,
  updateProfileAvatar,
} from '@/utils/imageUpload/repository/imageUpload.repository'

// Convert image buffer to WebP format at specified quality
async function convertToWebP(
  buffer: Buffer,
  fileType: string,
  quality = 80,
): Promise<{ buffer: Buffer; fileType: string }> {
  // Skip conversion for GIF (preserve animations)
  if (!shouldConvertToWebP(fileType)) {
    return { buffer, fileType }
  }

  // Convert JPEG, PNG, WebP to WebP
  try {
    const webpBuffer = await sharp(buffer).webp({ quality }).toBuffer()

    return { buffer: webpBuffer, fileType: 'image/webp' }
  } catch (error) {
    // If conversion fails, return original buffer
    console.error('WebP conversion failed, using original:', error)
    return { buffer, fileType }
  }
}

export async function uploadImageService(
  data: UploadImageInput,
  userId: string,
): Promise<{ imageUrl: string }> {
  validateImageUpload(data.fileSize, data.fileType)

  const supabase = getSupabaseServerClient()

  // Delete old image if exists
  if (data.oldUrl) {
    const oldPath = extractStorageObjectName(data.oldUrl)
    if (oldPath) {
      const { error: deleteError } = await supabase.storage
        .from(data.bucket)
        .remove([oldPath])
      if (deleteError) {
        console.log('⚠️ Failed to delete old image', {
          error: deleteError,
        })
      }
    }
  }

  const buffer = decodeBase64DataUrl(data.fileData)

  // Convert to WebP (reduces file size while maintaining quality)
  const { buffer: convertedBuffer, fileType: convertedFileType } =
    await convertToWebP(buffer, data.fileType, 80)

  const fileExt = resolveFileExtension(convertedFileType, data.fileName)
  const finalFileName = `${userId}-${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from(data.bucket)
    .upload(finalFileName, convertedBuffer, {
      contentType: convertedFileType,
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
      oldUrl: oldAvatarUrl ?? undefined,
    },
    userId,
  )

  await updateProfileAvatar(userId, uploadResult.imageUrl)

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
      oldUrl: course.thumbnailUrl ?? undefined,
    },
    userId,
  )

  await updateCourseThumbnail(data.courseId, uploadResult.imageUrl)

  return {
    thumbnailUrl: uploadResult.imageUrl,
  }
}
