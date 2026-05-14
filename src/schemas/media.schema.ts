import { z } from 'zod'
import { LIBRARY_TOPICS } from '@/lib/library-topics'

export const mediaKindEnum = z.enum(['youtube', 'document'])

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

export const uploadMediaPdfSchema = z.object({
  fileData: z.string().min(1),
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().nonnegative(),
  oldUrl: z.string().optional(),
})

export type CreateMediaInput = z.infer<typeof createMediaSchema>
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>
export type DeleteMediaInput = z.infer<typeof deleteMediaSchema>
export type GetMediaInput = z.infer<typeof getMediaSchema>
export type UploadMediaPdfInput = z.infer<typeof uploadMediaPdfSchema>
export type MediaKind = z.infer<typeof mediaKindEnum>
