import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { courses, profiles } from '@/db/schema'
import { getCurrentUser } from '@/utils/auth'
import { getSupabaseServerClient } from '@/utils/supabase'

export const uploadImageFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      fileData: string
      fileName: string
      fileType: string
      fileSize: number
      bucket: 'avatars' | 'course-thumbnails' | 'lesson-thumbnails'
      oldUrl?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    try {
      const user = await getCurrentUser()
      const supabase = getSupabaseServerClient()

      // Validate file
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (data.fileSize > maxSize) {
        return {
          error: true,
          message: 'File size must be less than 2MB',
        }
      }

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
      ]
      if (!allowedTypes.includes(data.fileType)) {
        return {
          error: true,
          message: 'Only JPEG, PNG, WebP, and GIF images are allowed',
        }
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

      // Generate unique filename
      const fileExt = data.fileName.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`

      // Convert base64 to buffer
      const base64Data = data.fileData.split(',')[1]
      const buffer = Buffer.from(base64Data, 'base64')

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(data.bucket)
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

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(data.bucket)
        .getPublicUrl(fileName)

      return {
        success: true,
        imageUrl: urlData.publicUrl,
      }
    } catch (error) {
      console.error('❌ Unexpected error in uploadImage:', error)
      return {
        error: true,
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      }
    }
  })

export const uploadAvatarFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      fileData: string
      fileName: string
      fileType: string
      fileSize: number
    }) => d,
  )
  .handler(async ({ data }) => {
    try {
      const user = await getCurrentUser()

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

      if (uploadResult.error || !uploadResult.imageUrl) {
        return uploadResult
      }

      // Update profile with new avatar URL
      await db
        .update(profiles)
        .set({
          avatarUrl: uploadResult.imageUrl,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, user.id))

      return {
        success: true,
        avatarUrl: uploadResult.imageUrl,
      }
    } catch (error) {
      console.error('❌ Unexpected error in uploadAvatar:', error)
      return {
        error: true,
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      }
    }
  })

export const uploadCourseThumbnailFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      fileData: string
      fileName: string
      fileType: string
      fileSize: number
      courseId: string
    }) => d,
  )
  .handler(async ({ data }) => {
    try {
      await getCurrentUser()

      // Get current course to find old thumbnail
      const currentCourse = await db.query.courses.findFirst({
        where: eq(courses.id, data.courseId),
      })

      if (!currentCourse) {
        return {
          error: true,
          message: 'Course not found',
        }
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

      if (uploadResult.error || !uploadResult.imageUrl) {
        return uploadResult
      }

      // Update course with new thumbnail URL
      await db
        .update(courses)
        .set({
          thumbnailUrl: uploadResult.imageUrl,
          updatedAt: new Date(),
        })
        .where(eq(courses.id, data.courseId))

      return {
        success: true,
        thumbnailUrl: uploadResult.imageUrl,
      }
    } catch (error) {
      console.error('❌ Unexpected error in uploadCourseThumbnail:', error)
      return {
        error: true,
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      }
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

// Client-side utility function for handling file uploads
export function handleImageUpload({
  file,
  onUploadStart,
  onUploadComplete,
  onUploadError,
  bucket,
  oldUrl,
}: {
  file: File
  onUploadStart?: () => void
  onUploadComplete?: (url: string) => void
  onUploadError?: (error: string) => void
  bucket: 'avatars' | 'course-thumbnails'
  oldUrl?: string
}) {
  // Convert file to base64
  const reader = new FileReader()
  reader.onloadend = async () => {
    const fileData = reader.result as string

    try {
      onUploadStart?.()

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileData,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          bucket,
          oldUrl,
        }),
      })

      const result = await response.json()

      if (result.error) {
        onUploadError?.(result.message || 'Failed to upload image')
      } else if (result.imageUrl) {
        onUploadComplete?.(result.imageUrl)
      }
    } catch (error) {
      onUploadError?.(error instanceof Error ? error.message : 'Upload failed')
    }
  }

  reader.readAsDataURL(file)
}
