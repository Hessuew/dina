import type { MediaLibraryRow } from '@/utils/library/library'
import { ValidationError } from '@/utils/errors'

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const

export const VIDEO_MAX_SIZE = 100 * 1024 * 1024

const PDF_MAX_SIZE = 25 * 1024 * 1024

export type MediaKind = 'youtube' | 'document' | 'video-file'

type RawMediaRow = MediaLibraryRow & {
  course?: { id: string; title: string; orderIndex: number } | null
}

export function toFileType(kind: MediaKind): MediaLibraryRow['fileType'] {
  if (kind === 'youtube') return 'video'
  if (kind === 'video-file') return 'video_file'
  return 'document'
}

export function buildMediaListItems(
  rows: Array<RawMediaRow>,
): Array<MediaLibraryRow> {
  return rows.map((row) => ({
    ...row,
    courseName: row.course?.title,
    courseNumber: row.course != null ? row.course.orderIndex + 1 : undefined,
  })) as Array<MediaLibraryRow>
}

export function canManageMedia(
  role: string,
  userId: string,
  uploaderId: string,
): boolean {
  return role === 'admin' || uploaderId === userId
}

export function validatePdfUpload(fileSize: number, fileType: string): void {
  if (fileSize > PDF_MAX_SIZE) {
    throw new ValidationError('File size must be less than 25MB', {
      details: { fileSize, maxSize: PDF_MAX_SIZE },
    })
  }
  if (!DOCUMENT_MIME_TYPES.includes(fileType)) {
    throw new ValidationError('Only PDF, PPTX, and DOCX files are allowed', {
      details: { fileType },
    })
  }
}

/** Prefer browser MIME; fall back to `.mp4` / `.webm` when type is empty/unknown. */
export function resolveVideoMimeType(
  fileType: string,
  fileName: string,
): (typeof VIDEO_MIME_TYPES)[number] | null {
  if ((VIDEO_MIME_TYPES as ReadonlyArray<string>).includes(fileType)) {
    return fileType as (typeof VIDEO_MIME_TYPES)[number]
  }
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'webm') return 'video/webm'
  if (ext === 'mp4') return 'video/mp4'
  return null
}

export function validateVideoUpload(
  fileSize: number,
  fileType: string,
  fileName: string,
): void {
  if (fileSize > VIDEO_MAX_SIZE) {
    throw new ValidationError('File size must be less than 100MB', {
      details: { fileSize, maxSize: VIDEO_MAX_SIZE },
    })
  }
  const mime = resolveVideoMimeType(fileType, fileName)
  if (!mime) {
    throw new ValidationError('Only MP4 and WebM videos are allowed', {
      details: { fileType, fileName },
    })
  }
}

export function extractMediaLibraryFilePath(fileUrl: string): string | null {
  const match = fileUrl.match(
    /\/object\/(?:public|sign)\/media-library\/([^?]+)/,
  )
  return match?.[1] ?? null
}

/** @deprecated Prefer extractMediaLibraryFilePath — same implementation. */
export function extractPdfFilePath(fileUrl: string): string | null {
  return extractMediaLibraryFilePath(fileUrl)
}

export function resolveVideoFileExtension(
  fileType: string,
  fileName: string,
): string {
  if (fileType === 'video/webm') return 'webm'
  if (fileType === 'video/mp4') return 'mp4'
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'webm' || ext === 'mp4') return ext
  return 'mp4'
}

export function buildVideoObjectName(
  userId: string,
  fileExt: string,
  nowMs: number,
): string {
  return `${userId}-${nowMs}.${fileExt}`
}

export function isOwnedMediaLibraryObjectUrl(
  fileUrl: string,
  userId: string,
): boolean {
  const path = extractMediaLibraryFilePath(fileUrl)
  if (!path) return false
  const objectName = path.split('/').pop() ?? path
  return objectName.startsWith(`${userId}-`)
}

export function needsSignedViewerUrl(
  fileType: MediaLibraryRow['fileType'],
): boolean {
  return fileType === 'document' || fileType === 'video_file'
}

/** True when prior private library object should be removed after an update. */
export function shouldRemoveMediaLibraryObject(params: {
  previousFileType: MediaLibraryRow['fileType']
  previousFileUrl: string
  nextFileType: MediaLibraryRow['fileType']
  nextFileUrl: string
}): boolean {
  if (!needsSignedViewerUrl(params.previousFileType)) return false
  return (
    params.previousFileType !== params.nextFileType ||
    params.previousFileUrl !== params.nextFileUrl
  )
}
