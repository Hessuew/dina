import { createServerFn } from '@tanstack/react-start'
import {
  uploadAvatarSchema,
  uploadCourseThumbnailSchema,
} from '@/schemas/image.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  uploadAvatarService,
  uploadCourseThumbnailService,
} from '@/utils/imageUpload/service/imageUpload.service'

export const uploadAvatarFn = createServerFn({ method: 'POST' })
  .inputValidator(uploadAvatarSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return uploadAvatarService(data, user.id)
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
