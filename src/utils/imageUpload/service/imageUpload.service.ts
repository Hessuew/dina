import type {
  RequestAvatarUploadInput,
  RequestCourseThumbnailUploadInput,
  UploadAvatarInput,
  UploadCourseThumbnailInput,
} from '@/schemas/image.schema'
import type { PrivateStorageBucket } from '@/utils/storage/domain/private-storage.domain'
import type { SignedUpload } from '@/utils/storage/service/private-storage.service'
import { AppError, NotFoundError, ValidationError } from '@/utils/errors'
import {
  resolveFileExtension,
  validateImageUpload,
} from '@/utils/imageUpload/domain/imageUpload.domain'
import {
  findCourseForThumbnail,
  findProfileAvatarPath,
  updateCourseThumbnailPath,
  updateProfileAvatarPath,
} from '@/utils/imageUpload/repository/imageUpload.repository'
import { authz } from '@/utils/authz'
import { getSupabaseAdminClient } from '@/utils/supabase'
import {
  buildOwnedStoragePath,
  extractPrivateStoragePath,
  isOwnedStoragePath,
} from '@/utils/storage/domain/private-storage.domain'
import {
  createPrivateSignedUpload,
  signPrivateStoragePath,
} from '@/utils/storage/service/private-storage.service'

export async function deleteStorageObject(
  bucket: PrivateStorageBucket,
  objectPath: string,
): Promise<void> {
  const admin = getSupabaseAdminClient()
  const { data: removed, error } = await admin.storage
    .from(bucket)
    .remove([objectPath])
  if (error || !removed.length) {
    console.error('Failed to delete old storage object', {
      bucket,
      objectPath,
      error,
    })
  }
}

export async function deleteStorageObjectStrict(
  bucket: PrivateStorageBucket,
  objectPath: string,
  userMessage: string,
): Promise<void> {
  const admin = getSupabaseAdminClient()
  const { error } = await admin.storage.from(bucket).remove([objectPath])
  if (!error) return
  throw new AppError({
    code: 'STORAGE_OPERATION_FAILED',
    status: 500,
    userMessage,
    internalMessage: error.message,
    details: { bucket, objectPath },
  })
}

function ownedPathOrThrow(
  value: string,
  bucket: PrivateStorageBucket,
  userId: string,
): string {
  const path = extractPrivateStoragePath(value, bucket)
  if (!path || !isOwnedStoragePath(path, userId)) {
    throw new ValidationError('Storage path is not owned by this user', {
      details: { bucket, path: value },
    })
  }
  return path
}

async function requestImageUpload(
  data: RequestAvatarUploadInput,
  userId: string,
  bucket: PrivateStorageBucket,
): Promise<SignedUpload> {
  validateImageUpload(data.fileSize, data.fileType)
  const extension = resolveFileExtension(data.fileType, data.fileName)
  const path = buildOwnedStoragePath(
    userId,
    extension,
    Date.now(),
    crypto.randomUUID(),
  )
  return createPrivateSignedUpload(bucket, path)
}

async function removePreviousPath(
  bucket: PrivateStorageBucket,
  previous: string | null | undefined,
  next: string,
): Promise<void> {
  const oldPath = extractPrivateStoragePath(previous, bucket)
  if (oldPath && oldPath !== next) await deleteStorageObject(bucket, oldPath)
}

export function requestAvatarUploadService(
  data: RequestAvatarUploadInput,
  userId: string,
): Promise<SignedUpload> {
  return requestImageUpload(data, userId, 'avatars')
}

export async function uploadAvatarService(
  data: UploadAvatarInput,
  userId: string,
): Promise<{ avatarUrl: string | null }> {
  const path = ownedPathOrThrow(data.path, 'avatars', userId)
  const oldPath = await findProfileAvatarPath(userId)
  await updateProfileAvatarPath(userId, path)
  await removePreviousPath('avatars', oldPath, path)
  return { avatarUrl: await signPrivateStoragePath('avatars', path) }
}

async function requireCourseThumbnailAccess(courseId: string, userId: string) {
  const course = await findCourseForThumbnail(courseId)
  if (!course) {
    throw new NotFoundError('Course not found', {
      code: 'COURSE_NOT_FOUND',
      details: { courseId },
    })
  }
  await authz(userId).perform('editCourse').on('course', courseId)
  return course
}

export async function requestCourseThumbnailUploadService(
  data: RequestCourseThumbnailUploadInput,
  userId: string,
): Promise<SignedUpload> {
  await requireCourseThumbnailAccess(data.courseId, userId)
  return requestImageUpload(data, userId, 'course-thumbnails')
}

export async function uploadCourseThumbnailService(
  data: UploadCourseThumbnailInput,
  userId: string,
): Promise<{ thumbnailUrl: string | null }> {
  const course = await requireCourseThumbnailAccess(data.courseId, userId)
  const path = ownedPathOrThrow(data.path, 'course-thumbnails', userId)
  await updateCourseThumbnailPath(data.courseId, path)
  await removePreviousPath('course-thumbnails', course.thumbnailUrl, path)
  return {
    thumbnailUrl: await signPrivateStoragePath('course-thumbnails', path),
  }
}
