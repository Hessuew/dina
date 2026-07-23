import { z } from 'zod'

export const uploadAvatarSchema = z.object({
  path: z.string().min(1, 'Storage path is required'),
})

export const requestAvatarUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().positive('File size must be positive'),
})

export const requestCourseThumbnailUploadSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().positive('File size must be positive'),
  courseId: z.uuid('Invalid course ID'),
})

export const uploadCourseThumbnailSchema = z.object({
  courseId: z.uuid('Invalid course ID'),
  path: z.string().min(1, 'Storage path is required'),
})

export type RequestAvatarUploadInput = z.infer<typeof requestAvatarUploadSchema>
export type RequestCourseThumbnailUploadInput = z.infer<
  typeof requestCourseThumbnailUploadSchema
>
export type UploadAvatarInput = z.infer<typeof uploadAvatarSchema>
export type UploadCourseThumbnailInput = z.infer<
  typeof uploadCourseThumbnailSchema
>
