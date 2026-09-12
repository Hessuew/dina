import type {
  CreateMediaInput,
  DeleteMediaInput,
  GetMediaInput,
  RequestMediaFileUploadInput,
  RequestMediaThumbnailUploadInput,
  UpdateMediaInput,
  UploadMediaThumbnailInput,
} from '@/schemas/media.schema'
import type { LogLevel } from '@/utils/observability/logger'
import type { MediaLibraryRow } from '@/utils/library/library'
import type { Role } from '@/utils/authz'
import type {
  MediaRecord,
  MediaRecordWithCourse,
} from '@/utils/library/repository/library.repository'
import type { SignedUpload } from '@/utils/storage/service/private-storage.service'
import { elapsedMs, getRequestId } from '@/utils/observability/request-context'
import { logServerEvent } from '@/utils/observability/logger'
import {
  canManageMedia,
  needsSignedViewerUrl,
  resolveAllowsDownload,
  resolveVideoFileExtension,
  resolveVideoMimeType,
  toFileType,
  validatePdfUpload,
  validateVideoUpload,
} from '@/utils/library/domain/library.domain'
import {
  deleteMedia,
  findAllMedia,
  findMediaById,
  insertMedia,
  updateMedia,
  updateMediaThumbnailPath,
} from '@/utils/library/repository/library.repository'
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  isAppError,
} from '@/utils/errors'
import { getUserProfile } from '@/utils/auth/auth'
import { calculateEntityPermissions } from '@/utils/authz/permissions'
import {
  resolveFileExtension,
  validateImageUpload,
} from '@/utils/imageUpload/domain/imageUpload.domain'
import { deleteStorageObject } from '@/utils/imageUpload/service/imageUpload.service'
import {
  buildOwnedStoragePath,
  extractPrivateStoragePath,
  isOwnedStoragePath,
} from '@/utils/storage/domain/private-storage.domain'
import {
  createPrivateSignedUpload,
  signPrivateStoragePath,
  signPrivateStoragePaths,
} from '@/utils/storage/service/private-storage.service'

type LibraryMutationAction =
  'createLibraryMedia' | 'updateLibraryMedia' | 'deleteLibraryMedia'

type LibraryMutationContext = {
  action: LibraryMutationAction
  actorId: string
  mediaId?: string
  startedAt: number
}

function logLibraryMutation(
  level: LogLevel,
  event: string,
  context: LibraryMutationContext,
  fields: Record<string, unknown> = {},
): void {
  logServerEvent(level, event, {
    requestId: getRequestId(),
    path: `serverFn:${context.action}`,
    status: level === 'error' ? 'failure' : 'success',
    durationMs: elapsedMs(context.startedAt),
    actorId: context.actorId,
    mediaId: context.mediaId,
    ...fields,
  })
}

function shouldLogLibraryMutationFailure(error: unknown): boolean {
  return !isAppError(error) || error.status >= 500
}

function requireStaffRole(role: Role, action: string): void {
  if (role !== 'student') return
  throw new AuthorizationError('Teacher access required', {
    code: 'ROLE_REQUIRED',
    internalMessage: `Student attempted to ${action}`,
    details: { role },
  })
}

async function getUserRole(userId: string): Promise<Role> {
  return (await getUserProfile(userId)).role
}

async function requireStaff(userId: string, action: string): Promise<Role> {
  const role = await getUserRole(userId)
  requireStaffRole(role, action)
  return role
}

function mediaFilePathOrThrow(
  value: string,
  userId: string,
  existingPath?: string | null,
): string {
  const path = extractPrivateStoragePath(value, 'media-library')
  if (path && path === existingPath) return path
  if (!path || !isOwnedStoragePath(path, userId)) {
    throw new ValidationError(
      'File must be an owned media-library object path',
      { details: { value } },
    )
  }
  return path
}

function mediaSource(
  data: Pick<CreateMediaInput, 'kind' | 'url'>,
  userId: string,
  existingPath?: string | null,
): { externalUrl: string | null; filePath: string | null } {
  if (data.kind === 'youtube') {
    return { externalUrl: data.url, filePath: null }
  }
  return {
    externalUrl: null,
    filePath: mediaFilePathOrThrow(data.url, userId, existingPath),
  }
}

export async function serializeMediaRecords(
  rows: ReadonlyArray<MediaRecordWithCourse>,
): Promise<Array<MediaLibraryRow>> {
  const [files, thumbnails] = await Promise.all([
    signPrivateStoragePaths(
      'media-library',
      rows.map((row) => row.filePath),
    ),
    signPrivateStoragePaths(
      'media-thumbnails',
      rows.map((row) => row.thumbnailUrl),
    ),
  ])

  return rows.map((row) => ({
    id: row.id,
    uploaderId: row.uploaderId,
    courseId: row.courseId,
    courseName: row.course?.title,
    courseNumber:
      row.course != null ? (row.course.orderIndex ?? 0) + 1 : undefined,
    title: row.title,
    category: row.category,
    description: row.description,
    fileUrl: row.externalUrl ?? files.get(row.filePath ?? '') ?? '',
    fileType: row.fileType,
    fileSize: row.fileSize,
    thumbnailUrl: thumbnails.get(row.thumbnailUrl ?? '') ?? null,
    isPublished: row.isPublished,
    allowsDownload: row.allowsDownload,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))
}

async function serializeMediaRecord(
  row: MediaRecord,
): Promise<MediaLibraryRow> {
  const [media] = await serializeMediaRecords([row])
  return media
}

export async function getLibraryMediaService(userId: string): Promise<{
  media: Array<MediaLibraryRow>
  viewer: { id: string; role: Role }
}> {
  const role = await getUserRole(userId)
  const rows = await findAllMedia(role === 'student')
  return {
    media: await serializeMediaRecords(rows),
    viewer: { id: userId, role },
  }
}

export async function getLibraryMediaItemService(
  data: GetMediaInput,
  userId: string,
) {
  const role = await getUserRole(userId)
  const row = await findMediaById(data.mediaId)
  if (!row) {
    throw new NotFoundError('Media not found', {
      details: { mediaId: data.mediaId },
    })
  }
  if (role === 'student' && !row.isPublished) {
    throw new AuthorizationError('Media not available', {
      internalMessage: `Student attempted to view unpublished media: ${data.mediaId}`,
      details: { mediaId: data.mediaId },
    })
  }

  const media = await serializeMediaRecord(row)
  const permissions = calculateEntityPermissions(
    role,
    { teacher1Id: row.uploaderId, teacher2Id: null },
    userId,
  )
  return {
    media,
    viewerUrl: needsSignedViewerUrl(row.fileType)
      ? media.fileUrl || null
      : null,
    permissions,
    viewer: { id: userId, role },
  }
}

export async function createLibraryMediaService(
  data: CreateMediaInput,
  userId: string,
): Promise<{ media: MediaLibraryRow }> {
  await requireStaff(userId, 'create library media')
  const source = mediaSource(data, userId)
  const context: LibraryMutationContext = {
    action: 'createLibraryMedia',
    actorId: userId,
    startedAt: performance.now(),
  }

  try {
    const media = await insertMedia({
      uploaderId: userId,
      courseId: data.courseId ?? null,
      title: data.title,
      category: data.category,
      description: data.description ?? null,
      ...source,
      fileType: toFileType(data.kind),
      fileSize: data.fileSize ?? null,
      isPublished: data.isPublished,
      allowsDownload: resolveAllowsDownload(data.kind, data.allowsDownload),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    context.mediaId = media.id
    const serialized = await serializeMediaRecord(media)
    logLibraryMutation('info', 'media_created', context, {
      mediaKind: data.kind,
      courseId: data.courseId ?? null,
    })
    return { media: serialized }
  } catch (error) {
    if (shouldLogLibraryMutationFailure(error)) {
      logLibraryMutation('error', 'media_mutation_failed', context, {
        errorCategory: 'media_persistence',
      })
    }
    throw error
  }
}

async function requireManagedMedia(
  mediaId: string,
  userId: string,
  action: string,
): Promise<MediaRecord> {
  const role = await getUserRole(userId)
  requireStaffRole(role, `${action} library media`)
  const existing = await findMediaById(mediaId)
  if (!existing) {
    throw new NotFoundError('Media not found', { details: { mediaId } })
  }
  if (!canManageMedia(role, userId, existing.uploaderId)) {
    throw new AuthorizationError(`Not authorized to ${action} this media`, {
      details: { mediaId, userId },
    })
  }
  return existing
}

async function removeReplacedMediaFile(
  previous: MediaRecord,
  nextPath: string | null,
): Promise<void> {
  if (!previous.filePath || previous.filePath === nextPath) return
  await deleteStorageObject('media-library', previous.filePath)
}

export async function updateLibraryMediaService(
  data: UpdateMediaInput,
  userId: string,
): Promise<{ media: MediaLibraryRow }> {
  const existing = await requireManagedMedia(data.mediaId, userId, 'edit')
  const source = mediaSource(data, userId, existing.filePath)
  const context: LibraryMutationContext = {
    action: 'updateLibraryMedia',
    actorId: userId,
    mediaId: data.mediaId,
    startedAt: performance.now(),
  }

  try {
    const media = await updateMedia(data.mediaId, {
      title: data.title,
      category: data.category,
      description: data.description ?? null,
      ...source,
      fileType: toFileType(data.kind),
      fileSize: data.fileSize ?? existing.fileSize ?? null,
      isPublished: data.isPublished,
      allowsDownload: resolveAllowsDownload(data.kind, data.allowsDownload),
      updatedAt: new Date(),
    })
    await removeReplacedMediaFile(existing, source.filePath)
    const serialized = await serializeMediaRecord(media)
    logLibraryMutation('info', 'media_updated', context, {
      mediaKind: data.kind,
      courseId: data.courseId ?? null,
    })
    return { media: serialized }
  } catch (error) {
    if (shouldLogLibraryMutationFailure(error)) {
      logLibraryMutation('error', 'media_mutation_failed', context, {
        errorCategory: 'media_persistence',
      })
    }
    throw error
  }
}

export async function deleteLibraryMediaService(
  data: DeleteMediaInput,
  userId: string,
): Promise<{ success: true }> {
  const existing = await requireManagedMedia(data.mediaId, userId, 'delete')
  const context: LibraryMutationContext = {
    action: 'deleteLibraryMedia',
    actorId: userId,
    mediaId: data.mediaId,
    startedAt: performance.now(),
  }

  try {
    await deleteMedia(data.mediaId)
    await Promise.all([
      existing.filePath
        ? deleteStorageObject('media-library', existing.filePath)
        : Promise.resolve(),
      existing.thumbnailUrl
        ? deleteStorageObject('media-thumbnails', existing.thumbnailUrl)
        : Promise.resolve(),
    ])
    logLibraryMutation('info', 'media_deleted', context)
    return { success: true }
  } catch (error) {
    if (shouldLogLibraryMutationFailure(error)) {
      logLibraryMutation('error', 'media_mutation_failed', context, {
        errorCategory: 'media_persistence',
      })
    }
    throw error
  }
}

function resolveDocumentExtension(fileType: string): string {
  if (fileType === 'application/pdf') return 'pdf'
  if (fileType.includes('presentationml')) return 'pptx'
  return 'docx'
}

export async function requestMediaFileUploadService(
  data: RequestMediaFileUploadInput,
  userId: string,
): Promise<SignedUpload> {
  await requireStaff(userId, 'request library file upload')
  let extension: string
  if (data.kind === 'video-file') {
    validateVideoUpload(data.fileSize, data.fileType, data.fileName)
    const mime =
      resolveVideoMimeType(data.fileType, data.fileName) ?? 'video/mp4'
    extension = resolveVideoFileExtension(mime, data.fileName)
  } else {
    validatePdfUpload(data.fileSize, data.fileType)
    extension = resolveDocumentExtension(data.fileType)
  }
  const path = buildOwnedStoragePath(
    userId,
    extension,
    Date.now(),
    crypto.randomUUID(),
  )
  return createPrivateSignedUpload('media-library', path)
}

export async function requestMediaThumbnailUploadService(
  data: RequestMediaThumbnailUploadInput,
  userId: string,
): Promise<SignedUpload> {
  await requireManagedMedia(data.mediaId, userId, 'edit')
  validateImageUpload(data.fileSize, data.fileType)
  const extension = resolveFileExtension(data.fileType, data.fileName)
  const path = buildOwnedStoragePath(
    userId,
    extension,
    Date.now(),
    crypto.randomUUID(),
  )
  return createPrivateSignedUpload('media-thumbnails', path)
}

export async function uploadMediaThumbnailService(
  data: UploadMediaThumbnailInput,
  userId: string,
): Promise<{ thumbnailUrl: string | null }> {
  const existing = await requireManagedMedia(data.mediaId, userId, 'edit')
  const path = extractPrivateStoragePath(data.path, 'media-thumbnails')
  if (!path || !isOwnedStoragePath(path, userId)) {
    throw new ValidationError('Thumbnail path is not owned by this user')
  }
  await updateMediaThumbnailPath(data.mediaId, path)
  if (existing.thumbnailUrl && existing.thumbnailUrl !== path) {
    await deleteStorageObject('media-thumbnails', existing.thumbnailUrl)
  }
  return {
    thumbnailUrl: await signPrivateStoragePath('media-thumbnails', path),
  }
}
