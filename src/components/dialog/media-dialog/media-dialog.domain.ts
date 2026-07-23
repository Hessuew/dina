import type { LibraryTopic } from '@/lib/library-topics'
import type { MediaLibraryRow } from '@/utils/library/library'

export type MediaDialogMode = 'create' | 'edit' | 'delete'
export type MediaKind = 'youtube' | 'document' | 'video-file'

export type MediaFormData = {
  title: string
  category: string
  description: string
  kind: MediaKind
  url: string
  isPublished: boolean
}

export const emptyFormData: MediaFormData = {
  title: '',
  category: '',
  description: '',
  kind: 'youtube',
  url: '',
  isPublished: false,
}

export function validateYoutubeUrl(
  url: string,
  kind: MediaKind,
): string | undefined {
  return kind === 'youtube' && !url ? 'URL is required' : undefined
}

export function fromFileType(fileType: MediaLibraryRow['fileType']): MediaKind {
  if (fileType === 'document') return 'document'
  if (fileType === 'video_file') return 'video-file'
  return 'youtube'
}

export function getInitialValues(
  media: MediaLibraryRow | undefined,
  mode: MediaDialogMode,
  courseId: string | undefined,
): MediaFormData {
  if (!media || mode === 'create') {
    return { ...emptyFormData, kind: courseId ? 'document' : 'youtube' }
  }
  return {
    title: media.title,
    category: media.category,
    description: media.description ?? '',
    kind: fromFileType(media.fileType),
    url: '',
    isPublished: media.isPublished,
  }
}

export function getFilenameFromUrl(url: string): string {
  // `.split('/')` always yields a non-empty array, so `.pop()` is defined.
  return url.split('?')[0].split('/').pop()!
}

export type DocumentFileVariant = 'picked' | 'existing' | 'empty'

export function getDocumentFileVariant(params: {
  hasPickedFile: boolean
  hasExistingDoc: boolean
}): DocumentFileVariant {
  if (params.hasPickedFile) return 'picked'
  if (params.hasExistingDoc) return 'existing'
  return 'empty'
}

export function getThumbnailPreviewSrc(params: {
  fileData: string | null
  thumbnailUrl: string | null
}): string | null {
  return params.fileData || params.thumbnailUrl || null
}

export type MediaOpenResetState = {
  existingDocUrl: string | null
  existingVideoUrl: string | null
  thumbnailUrl: string | null
}

export function computeOpenResetState(params: {
  mode: MediaDialogMode
  media: MediaLibraryRow | undefined
}): MediaOpenResetState {
  const { mode, media } = params
  const isDocEdit = mode === 'edit' && media?.fileType === 'document'
  const isVideoFileEdit = mode === 'edit' && media?.fileType === 'video_file'
  return {
    existingDocUrl: isDocEdit ? media.fileUrl : null,
    existingVideoUrl: isVideoFileEdit ? media.fileUrl : null,
    thumbnailUrl: media?.thumbnailUrl ?? null,
  }
}

export type MediaDialogChrome = {
  title: string
  subtitle: string
  submitLabel: string
}

export function getMediaDialogChrome(
  mode: 'create' | 'edit',
): MediaDialogChrome {
  if (mode === 'create') {
    return {
      title: 'Create Media',
      subtitle: 'Add a new item to the library',
      submitLabel: 'Create Media',
    }
  }
  return {
    title: 'Edit Media',
    subtitle: 'Update this library item',
    submitLabel: 'Save Changes',
  }
}

export function getMediaLoadingLabel(isUploading: boolean): string | undefined {
  return isUploading ? 'Uploading...' : undefined
}

export function isMediaDialogSubmitting(params: {
  isAnyPending: boolean
  isDocUploading: boolean
  isVideoUploading: boolean
  isThumbUploading: boolean
}): boolean {
  return (
    params.isAnyPending ||
    params.isDocUploading ||
    params.isVideoUploading ||
    params.isThumbUploading
  )
}

export type DocumentResolution =
  | { ok: true; url: string; fileSize?: number }
  | { ok: false; message: string }

/**
 * Pre-flight check before attempting a document upload.
 * Returns a resolved DocumentResolution if no upload is needed,
 * or null to signal the caller should proceed with the upload.
 */
export function preflightDocumentUrl(params: {
  hasFile: boolean
  existingDocUrl: string | null
}): DocumentResolution | null {
  if (!params.hasFile) {
    if (params.existingDocUrl) return { ok: true, url: params.existingDocUrl }
    return { ok: false, message: 'Please upload a document file' }
  }
  return null
}

export type VideoResolution =
  | { ok: true; url: string; fileSize?: number }
  | { ok: false; message: string }

export function preflightVideoUrl(params: {
  hasFile: boolean
  existingVideoUrl: string | null
}): VideoResolution | null {
  if (!params.hasFile) {
    if (params.existingVideoUrl)
      return { ok: true, url: params.existingVideoUrl }
    return { ok: false, message: 'Please upload a video file' }
  }
  return null
}

export function resolveDocumentUploadResult(params: {
  fileUrl: string | undefined
  currentUrl: string
  fileSize: number
}): DocumentResolution {
  if (params.fileUrl)
    return { ok: true, url: params.fileUrl, fileSize: params.fileSize }
  return { ok: true, url: params.currentUrl }
}

export function buildPdfUploadData(params: {
  fileData: string
  fileName: string
  fileType: string
  fileSize: number
  mode: MediaDialogMode
  media: MediaLibraryRow | undefined
}): {
  fileData: string
  fileName: string
  fileType: string
  fileSize: number
  mediaId?: string
} {
  return {
    fileData: params.fileData,
    fileName: params.fileName,
    fileType: params.fileType,
    fileSize: params.fileSize,
    ...(params.mode === 'edit' && params.media
      ? { mediaId: params.media.id }
      : {}),
  }
}

export type MediaSubmitPayload = {
  title: string
  category: LibraryTopic
  description: string | undefined
  isPublished: boolean
  kind: MediaKind
  url: string
  fileSize: number | undefined
  courseId: string | undefined
}

export function buildMediaPayload(params: {
  value: MediaFormData
  url: string
  fileSize: number | undefined
  courseId: string | undefined
}): MediaSubmitPayload {
  return {
    title: params.value.title,
    category: params.value.category as LibraryTopic,
    description: params.value.description || undefined,
    isPublished: params.value.isPublished,
    kind: params.value.kind,
    url: params.url,
    fileSize: params.fileSize,
    courseId: params.courseId,
  }
}

export type FileResolution =
  | { ok: true; url: string; fileSize?: number }
  | { ok: false; message: string }
