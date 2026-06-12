import { z } from 'zod'

export const uploadAvatarSchema = z.object({
  fileData: z.string().min(1, 'File data is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().positive('File size must be positive'),
  bucket: z.string().optional(),
})

export const uploadCourseThumbnailSchema = z.object({
  fileData: z.string().min(1, 'File data is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileType: z.string().min(1, 'File type is required'),
  fileSize: z.number().positive('File size must be positive'),
  courseId: z.uuid('Invalid course ID'),
  bucket: z.string().optional(),
})

const uploadImageSchema = uploadAvatarSchema.extend({
  bucket: z.string().min(1, 'Bucket is required'),
  oldUrl: z.string().optional(),
})

export type UploadAvatarInput = z.infer<typeof uploadAvatarSchema>
export type UploadImageInput = z.infer<typeof uploadImageSchema>
export type UploadCourseThumbnailInput = z.infer<
  typeof uploadCourseThumbnailSchema
>
