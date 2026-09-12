import { createServerFn } from '@tanstack/react-start'
import {
  createMediaSchema,
  deleteMediaSchema,
  getMediaSchema,
  requestMediaFileUploadSchema,
  requestMediaThumbnailUploadSchema,
  updateMediaSchema,
  uploadMediaThumbnailSchema,
} from '@/schemas/media.schema'
import { getCurrentUser } from '@/utils/auth/auth'
import {
  createLibraryMediaService,
  deleteLibraryMediaService,
  getLibraryMediaItemService,
  getLibraryMediaService,
  requestMediaFileUploadService,
  requestMediaThumbnailUploadService,
  updateLibraryMediaService,
  uploadMediaThumbnailService,
} from '@/utils/library/service/library.service'

export type MediaLibraryRow = {
  id: string
  uploaderId: string
  courseId: string | null
  courseName?: string
  courseNumber?: number
  title: string
  category: string
  description: string | null
  fileUrl: string
  fileType: 'video' | 'video_file' | 'audio' | 'document' | 'image' | 'other'
  fileSize: number | null
  thumbnailUrl: string | null
  isPublished: boolean
  allowsDownload: boolean
  createdAt: Date
  updatedAt: Date
}

export const getLibraryMedia = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    return getLibraryMediaService(user.id)
  },
)

export const getLibraryMediaItem = createServerFn({ method: 'POST' })
  .inputValidator(getMediaSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return getLibraryMediaItemService(data, user.id)
  })

export const createLibraryMedia = createServerFn({ method: 'POST' })
  .inputValidator(createMediaSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return createLibraryMediaService(data, user.id)
  })

export const updateLibraryMedia = createServerFn({ method: 'POST' })
  .inputValidator(updateMediaSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return updateLibraryMediaService(data, user.id)
  })

export const deleteLibraryMedia = createServerFn({ method: 'POST' })
  .inputValidator(deleteMediaSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return deleteLibraryMediaService(data, user.id)
  })

export const requestMediaFileUploadFn = createServerFn({ method: 'POST' })
  .inputValidator(requestMediaFileUploadSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return requestMediaFileUploadService(data, user.id)
  })

export const requestMediaThumbnailUploadFn = createServerFn({ method: 'POST' })
  .inputValidator(requestMediaThumbnailUploadSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return requestMediaThumbnailUploadService(data, user.id)
  })

export const uploadMediaThumbnailFn = createServerFn({ method: 'POST' })
  .inputValidator(uploadMediaThumbnailSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    return uploadMediaThumbnailService(data, user.id)
  })
