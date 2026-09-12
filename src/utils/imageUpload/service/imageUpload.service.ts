import type {
  RequestAvatarUploadInput,
  RequestCourseThumbnailUploadInput,
  UploadAvatarInput,
  UploadCourseThumbnailInput,
} from '@/schemas/image.schema'
import type { PrivateStorageBucket } from '@/utils/storage/domain/private-storage.domain'
import type { SignedUpload } from '@/utils/storage/service/private-storage.service'
import type { LogLevel } from '@/utils/observability/logger'
import {
  AppError,
  NotFoundError,
  ValidationError,
  isAppError,
} from '@/utils/errors'
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
import { getUserProfile } from '@/utils/auth/auth'
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
import { logServerEvent } from '@/utils/observability/logger'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'

type ImageUploadAction =
  | 'request_avatar_upload'
  | 'upload_avatar'
  | 'request_course_thumbnail_upload'
  | 'upload_course_thumbnail'

type ImageUploadLogContext = {
  action: ImageUploadAction
  bucket: PrivateStorageBucket
  startedAt: number
  userId: string
  courseId?: string
}

function logImageUploadEvent(
  level: LogLevel,
  event: string,
  context: ImageUploadLogContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    bucket: context.bucket,
    userId: context.userId,
    ...(context.courseId ? { courseId: context.courseId } : {}),
    ...fields,
  })
}

async function runImageUploadAction<T>(
  context: ImageUploadLogContext,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    const result = await operation()
    logImageUploadEvent('info', 'image_upload_completed', context)
    return result
  } catch (error) {
    if (!isAppError(error) || error.status >= 500) {
      logImageUploadEvent('error', 'image_upload_failed', context, {
        errorCategory: isAppError(error) ? error.code : 'unexpected',
      })
    }
    throw error
  }
}

export async function deleteStorageObject(
  bucket: PrivateStorageBucket,
  objectPath: string,
): Promise<void> {
  const admin = getSupabaseAdminClient()
  const { data: removed, error } = await admin.storage
    .from(bucket)
    .remove([objectPath])
  if (error || !removed.length) {
    logServerEvent('warn', 'storage_object_cleanup_failed', {
      requestId: getRequestId(),
      path: 'storage:delete_object',
      status: 'failure',
      bucket,
      errorCategory: error ? 'storage_delete' : 'storage_object_missing',
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
  return runImageUploadAction(
    {
      action: 'request_avatar_upload',
      bucket: 'avatars',
      startedAt: performance.now(),
      userId,
    },
    async () => {
      await getUserProfile(userId)
      return requestImageUpload(data, userId, 'avatars')
    },
  )
}

export async function uploadAvatarService(
  data: UploadAvatarInput,
  userId: string,
): Promise<{ avatarUrl: string | null }> {
  return runImageUploadAction(
    {
      action: 'upload_avatar',
      bucket: 'avatars',
      startedAt: performance.now(),
      userId,
    },
    async () => {
      await getUserProfile(userId)
      const path = ownedPathOrThrow(data.path, 'avatars', userId)
      const oldPath = await findProfileAvatarPath(userId)
      await updateProfileAvatarPath(userId, path)
      await removePreviousPath('avatars', oldPath, path)
      return { avatarUrl: await signPrivateStoragePath('avatars', path) }
    },
  )
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
  return runImageUploadAction(
    {
      action: 'request_course_thumbnail_upload',
      bucket: 'course-thumbnails',
      courseId: data.courseId,
      startedAt: performance.now(),
      userId,
    },
    async () => {
      await requireCourseThumbnailAccess(data.courseId, userId)
      return requestImageUpload(data, userId, 'course-thumbnails')
    },
  )
}

export async function uploadCourseThumbnailService(
  data: UploadCourseThumbnailInput,
  userId: string,
): Promise<{ thumbnailUrl: string | null }> {
  return runImageUploadAction(
    {
      action: 'upload_course_thumbnail',
      bucket: 'course-thumbnails',
      courseId: data.courseId,
      startedAt: performance.now(),
      userId,
    },
    async () => {
      const course = await requireCourseThumbnailAccess(data.courseId, userId)
      const path = ownedPathOrThrow(data.path, 'course-thumbnails', userId)
      await updateCourseThumbnailPath(data.courseId, path)
      await removePreviousPath('course-thumbnails', course.thumbnailUrl, path)
      return {
        thumbnailUrl: await signPrivateStoragePath('course-thumbnails', path),
      }
    },
  )
}
