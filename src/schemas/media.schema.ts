import { z } from 'zod'
import { LIBRARY_TOPICS } from '@/lib/library-topics'

const mediaKindEnum = z.enum(['youtube', 'document', 'video-file'])

export const createMediaSchema = z.object({
  title: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.enum([...LIBRARY_TOPICS]),
  isPublished: z.boolean().optional().default(false),
  kind: mediaKindEnum,
  url: z.string().min(1, 'URL is required'),
  fileSize: z.number().int().positive().optional(),
  courseId: z.uuid().optional(),
})

export const updateMediaSchema = createMediaSchema.extend({
  mediaId: z.uuid('Invalid media ID'),
})

export const deleteMediaSchema = z.object({
  mediaId: z.uuid('Invalid media ID'),
})

export const getMediaSchema = z.object({
  mediaId: z.uuid('Invalid media ID'),
})

export const requestMediaFileUploadSchema = z.object({
  kind: z.enum(['document', 'video-file']),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
})

export const requestMediaThumbnailUploadSchema = z.object({
  mediaId: z.uuid(),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
})

export const uploadMediaThumbnailSchema = z.object({
  mediaId: z.uuid(),
  path: z.string().min(1),
})

export type CreateMediaInput = z.infer<typeof createMediaSchema>
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>
export type DeleteMediaInput = z.infer<typeof deleteMediaSchema>
export type GetMediaInput = z.infer<typeof getMediaSchema>
export type RequestMediaFileUploadInput = z.infer<
  typeof requestMediaFileUploadSchema
>
export type RequestMediaThumbnailUploadInput = z.infer<
  typeof requestMediaThumbnailUploadSchema
>
export type UploadMediaThumbnailInput = z.infer<
  typeof uploadMediaThumbnailSchema
>
