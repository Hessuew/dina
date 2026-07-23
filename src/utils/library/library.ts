import { createServerFn } from '@tanstack/react-start'
import {
  createMediaSchema,
  deleteMediaSchema,
  getMediaSchema,
  requestMediaVideoUploadSchema,
  updateMediaSchema,
  uploadMediaPdfSchema,
  uploadMediaThumbnailSchema,
} from '@/schemas/media.schema'
import { getCurrentUser, getUserProfile } from '@/utils/auth/auth'
import {
  createLibraryMediaService,
  deleteLibraryMediaService,
  getLibraryMediaItemService,
  getLibraryMediaService,
  requestMediaVideoUploadService,
  updateLibraryMediaService,
  uploadMediaPdfService,
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
  createdAt: Date
  updatedAt: Date
}

export const getLibraryMedia = createServerFn({ method: 'POST' }).handler(
  async () => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)
    return getLibraryMediaService(user.id, profile.role)
  },
)

export const getLibraryMediaItem = createServerFn({ method: 'POST' })
  .inputValidator(getMediaSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)
    return getLibraryMediaItemService(data, user.id, profile.role)
  })

export const createLibraryMedia = createServerFn({ method: 'POST' })
  .inputValidator(createMediaSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)
    return createLibraryMediaService(data, user.id, profile.role)
  })

export const updateLibraryMedia = createServerFn({ method: 'POST' })
  .inputValidator(updateMediaSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)
    return updateLibraryMediaService(data, user.id, profile.role)
  })

export const deleteLibraryMedia = createServerFn({ method: 'POST' })
  .inputValidator(deleteMediaSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)
    return deleteLibraryMediaService(data, user.id, profile.role)
  })

export const uploadMediaPdfFn = createServerFn({ method: 'POST' })
  .inputValidator(uploadMediaPdfSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)
    return uploadMediaPdfService(data, user.id, profile.role)
  })

export const uploadMediaThumbnailFn = createServerFn({ method: 'POST' })
  .inputValidator(uploadMediaThumbnailSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)
    return uploadMediaThumbnailService(data, user.id, profile.role)
  })

export const requestMediaVideoUploadFn = createServerFn({ method: 'POST' })
  .inputValidator(requestMediaVideoUploadSchema)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    const profile = await getUserProfile(user.id)
    return requestMediaVideoUploadService(data, user.id, profile.role)
  })
