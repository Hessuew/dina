import type { MediaLibraryRow } from '@/utils/library/library'
import { ValidationError } from '@/utils/errors'

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const PDF_MAX_SIZE = 25 * 1024 * 1024

type RawMediaRow = MediaLibraryRow & {
  course?: { id: string; title: string; orderIndex: number } | null
}

export function toFileType(
  kind: 'youtube' | 'document',
): MediaLibraryRow['fileType'] {
  return kind === 'youtube' ? 'video' : 'document'
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

export function extractPdfFilePath(fileUrl: string): string | null {
  const match = fileUrl.match(
    /\/object\/(?:public|sign)\/media-library\/([^?]+)/,
  )
  return match?.[1] ?? null
}
