import { createServerFn } from '@tanstack/react-start'
import {
  requestAvatarUploadSchema,
  requestCourseThumbnailUploadSchema,
  uploadAvatarSchema,
  uploadCourseThumbnailSchema,
} from '@/schemas/image.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  requestAvatarUploadService,
  requestCourseThumbnailUploadService,
  uploadAvatarService,
  uploadCourseThumbnailService,
} from '@/utils/imageUpload/service/imageUpload.service'

export const requestAvatarUploadFn = createServerFn({ method: 'POST' })
  .inputValidator(requestAvatarUploadSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return requestAvatarUploadService(data, user.id)
  })

export const uploadAvatarFn = createServerFn({ method: 'POST' })
  .inputValidator(uploadAvatarSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return uploadAvatarService(data, user.id)
  })

export const requestCourseThumbnailUploadFn = createServerFn({ method: 'POST' })
  .inputValidator(requestCourseThumbnailUploadSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return requestCourseThumbnailUploadService(data, user.id)
  })

export const uploadCourseThumbnailFn = createServerFn({ method: 'POST' })
  .inputValidator(uploadCourseThumbnailSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return uploadCourseThumbnailService(data, user.id)
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
