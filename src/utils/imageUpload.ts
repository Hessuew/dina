import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import { getDb } from '@/db'
import { courses, profiles } from '@/db/schema'
import {
  uploadAvatarSchema,
  uploadCourseThumbnailSchema,
  uploadImageSchema,
} from '@/schemas/image.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import { getSupabaseServerClient } from '@/utils/supabase'
import { AppError, NotFoundError, ValidationError } from '@/utils/errors'

// Convert image buffer to WebP format at specified quality
async function convertToWebP(
  buffer: Buffer,
  fileType: string,
  quality = 80,
): Promise<{ buffer: Buffer; fileType: string }> {
  // Skip conversion for GIF (preserve animations)
  if (fileType === 'image/gif') {
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

export const uploadImageFn = createServerFn({ method: 'POST' })
  .inputValidator(uploadImageSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const supabase = getSupabaseServerClient()

    // Validate file
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (data.fileSize > maxSize) {
      throw new ValidationError('File size must be less than 2MB', {
        details: { fileSize: data.fileSize, maxSize },
      })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(data.fileType)) {
      throw new ValidationError(
        'Only JPEG, PNG, WebP, and GIF images are allowed',
        {
          details: { fileType: data.fileType },
        },
      )
    }

    // Delete old image if exists
    if (data.oldUrl) {
      const oldPath = data.oldUrl.split('/').pop()
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

    // Convert base64 to buffer
    const base64Data = data.fileData.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Convert to WebP (reduces file size while maintaining quality)
    const { buffer: convertedBuffer, fileType: convertedFileType } =
      await convertToWebP(buffer, data.fileType, 80)

    // Generate filename with correct extension
    const fileExt =
      convertedFileType === 'image/webp'
        ? 'webp'
        : data.fileName.split('.').pop()
    const finalFileName = `${user.id}-${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(data.bucket)
      .getPublicUrl(finalFileName)

    return {
      imageUrl: urlData.publicUrl,
    }
  })

export const uploadAvatarFn = createServerFn({ method: 'POST' })
  .inputValidator(uploadAvatarSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const db = await getDb()

    // Get current profile to find old avatar
    const currentProfile = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    })

    // Upload new image
    const uploadResult = await uploadImageFn({
      data: {
        ...data,
        bucket: 'avatars',
        oldUrl: currentProfile?.avatarUrl || undefined,
      },
    })

    // Update profile with new avatar URL
    await db
      .update(profiles)
      .set({
        avatarUrl: uploadResult.imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id))

    return {
      avatarUrl: uploadResult.imageUrl,
    }
  })

export const uploadCourseThumbnailFn = createServerFn({ method: 'POST' })
  .inputValidator(uploadCourseThumbnailSchema)
  .handler(async ({ data }) => {
    await getCurrentUser()
    const db = await getDb()

    // Get current course to find old thumbnail
    const currentCourse = await db.query.courses.findFirst({
      where: eq(courses.id, data.courseId),
    })

    if (!currentCourse) {
      throw new NotFoundError('Course not found', {
        code: 'COURSE_NOT_FOUND',
        details: { courseId: data.courseId },
      })
    }

    // Upload new image
    const uploadResult = await uploadImageFn({
      data: {
        fileData: data.fileData,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        bucket: 'course-thumbnails',
        oldUrl: currentCourse.thumbnailUrl || undefined,
      },
    })

    // Update course with new thumbnail URL
    await db
      .update(courses)
      .set({
        thumbnailUrl: uploadResult.imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, data.courseId))
      .returning()

    return {
      thumbnailUrl: uploadResult.imageUrl,
    }
  })

// Utility to convert File to base64 string
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}
