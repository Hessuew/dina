import { describe, expect, it } from 'vitest'
import type { MediaLibraryRow } from '@/utils/library/library'
import { ValidationError } from '@/utils/errors'
import {
  DOCUMENT_MIME_TYPES,
  VIDEO_MAX_SIZE,
  VIDEO_MIME_TYPES,
  buildMediaListItems,
  buildVideoObjectName,
  canManageMedia,
  extractMediaLibraryFilePath,
  extractPdfFilePath,
  isOwnedMediaLibraryObjectUrl,
  needsSignedViewerUrl,
  resolveVideoFileExtension,
  resolveVideoMimeType,
  shouldRemoveMediaLibraryObject,
  toFileType,
  validatePdfUpload,
  validateVideoUpload,
} from '@/utils/library/domain/library.domain'

const makeRow = (
  overrides: Partial<
    MediaLibraryRow & {
      course?: { id: string; title: string; orderIndex: number } | null
    }
  > = {},
): MediaLibraryRow & {
  course?: { id: string; title: string; orderIndex: number } | null
} => ({
  id: 'media-1',
  uploaderId: 'user-1',
  courseId: null,
  title: 'Test Media',
  category: 'General',
  description: null,
  fileUrl: 'https://example.com/file.pdf',
  fileType: 'document' as const,
  fileSize: null,
  thumbnailUrl: null,
  isPublished: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  course: null,
  ...overrides,
})

describe('toFileType', () => {
  it("maps 'youtube' to 'video'", () => {
    expect(toFileType('youtube')).toBe('video')
  })

  it("maps 'document' to 'document'", () => {
    expect(toFileType('document')).toBe('document')
  })

  it("maps 'video-file' to 'video_file'", () => {
    expect(toFileType('video-file')).toBe('video_file')
  })
})

describe('buildMediaListItems', () => {
  it('returns empty array for empty input', () => {
    expect(buildMediaListItems([])).toEqual([])
  })

  it('sets courseName and courseNumber to undefined when course is null', () => {
    const result = buildMediaListItems([makeRow({ course: null })])
    expect(result[0].courseName).toBeUndefined()
    expect(result[0].courseNumber).toBeUndefined()
  })

  it('derives courseNumber as orderIndex + 1 for orderIndex 0', () => {
    const result = buildMediaListItems([
      makeRow({ course: { id: 'c-1', title: 'Course A', orderIndex: 0 } }),
    ])
    expect(result[0].courseName).toBe('Course A')
    expect(result[0].courseNumber).toBe(1)
  })

  it('derives courseNumber as orderIndex + 1 for orderIndex 4', () => {
    const result = buildMediaListItems([
      makeRow({ course: { id: 'c-1', title: 'Course E', orderIndex: 4 } }),
    ])
    expect(result[0].courseNumber).toBe(5)
  })

  it('maps multiple rows independently', () => {
    const rows = [
      makeRow({
        id: 'm-1',
        course: { id: 'c-1', title: 'Alpha', orderIndex: 0 },
      }),
      makeRow({ id: 'm-2', course: null }),
    ]
    const result = buildMediaListItems(rows)
    expect(result).toHaveLength(2)
    expect(result[0].courseNumber).toBe(1)
    expect(result[1].courseNumber).toBeUndefined()
  })

  it('preserves all other fields on the row', () => {
    const row = makeRow({
      id: 'preserve-me',
      title: 'Preserved',
      isPublished: false,
      course: null,
    })
    const result = buildMediaListItems([row])
    expect(result[0].id).toBe('preserve-me')
    expect(result[0].title).toBe('Preserved')
    expect(result[0].isPublished).toBe(false)
  })
})

describe('canManageMedia', () => {
  it('returns true for admin regardless of uploaderId', () => {
    expect(canManageMedia('admin', 'user-1', 'user-2')).toBe(true)
  })

  it('returns true for admin even when uploaderId matches userId', () => {
    expect(canManageMedia('admin', 'user-1', 'user-1')).toBe(true)
  })

  it('returns true for teacher when uploaderId matches userId', () => {
    expect(canManageMedia('teacher', 'user-1', 'user-1')).toBe(true)
  })

  it('returns false for teacher when uploaderId does not match userId', () => {
    expect(canManageMedia('teacher', 'user-1', 'user-2')).toBe(false)
  })

  it('returns true for student when uploaderId matches userId', () => {
    expect(canManageMedia('student', 'user-1', 'user-1')).toBe(true)
  })

  it('returns false for student when uploaderId does not match userId', () => {
    expect(canManageMedia('student', 'user-1', 'user-2')).toBe(false)
  })
})

describe('validatePdfUpload', () => {
  const MAX_SIZE = 25 * 1024 * 1024

  it('does not throw for valid size and application/pdf', () => {
    expect(() => validatePdfUpload(0, 'application/pdf')).not.toThrow()
  })

  it('does not throw for valid size and PPTX MIME type', () => {
    expect(() =>
      validatePdfUpload(
        0,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ),
    ).not.toThrow()
  })

  it('does not throw for valid size and DOCX MIME type', () => {
    expect(() =>
      validatePdfUpload(
        0,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).not.toThrow()
  })

  it('does not throw at exactly 25MB', () => {
    expect(() => validatePdfUpload(MAX_SIZE, 'application/pdf')).not.toThrow()
  })

  it('throws ValidationError when file size exceeds 25MB', () => {
    expect(() => validatePdfUpload(MAX_SIZE + 1, 'application/pdf')).toThrow(
      ValidationError,
    )
  })

  it('throws with correct message when file size exceeds 25MB', () => {
    expect(() => validatePdfUpload(MAX_SIZE + 1, 'application/pdf')).toThrow(
      'File size must be less than 25MB',
    )
  })

  it('throws ValidationError for unsupported MIME type', () => {
    expect(() => validatePdfUpload(0, 'image/jpeg')).toThrow(ValidationError)
  })

  it('throws with correct message for unsupported MIME type', () => {
    expect(() => validatePdfUpload(0, 'image/jpeg')).toThrow(
      'Only PDF, PPTX, and DOCX files are allowed',
    )
  })

  it('checks size before MIME type — throws size error when both are invalid', () => {
    expect(() => validatePdfUpload(MAX_SIZE + 1, 'image/jpeg')).toThrow(
      'File size must be less than 25MB',
    )
  })

  it('DOCUMENT_MIME_TYPES contains exactly three entries', () => {
    expect(DOCUMENT_MIME_TYPES).toHaveLength(3)
  })
})

describe('extractPdfFilePath / extractMediaLibraryFilePath', () => {
  it('extracts path from /object/public/ URL', () => {
    const url =
      'https://project.supabase.co/storage/v1/object/public/media-library/some/path.pdf'
    expect(extractPdfFilePath(url)).toBe('some/path.pdf')
    expect(extractMediaLibraryFilePath(url)).toBe('some/path.pdf')
  })

  it('extracts path from /object/sign/ URL', () => {
    const url =
      'https://project.supabase.co/storage/v1/object/sign/media-library/folder/file.pdf'
    expect(extractPdfFilePath(url)).toBe('folder/file.pdf')
  })

  it('extracts path without query string', () => {
    const url =
      'https://project.supabase.co/storage/v1/object/public/media-library/doc.pdf?token=abc123'
    expect(extractPdfFilePath(url)).toBe('doc.pdf')
  })

  it('returns null for URL that does not match pattern', () => {
    expect(extractPdfFilePath('https://example.com/other/path.pdf')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractPdfFilePath('')).toBeNull()
  })
})

describe('resolveVideoMimeType', () => {
  it('keeps an allowed MIME', () => {
    expect(resolveVideoMimeType('video/mp4', 'x.bin')).toBe('video/mp4')
  })

  it('infers mp4 from filename when MIME is empty', () => {
    expect(resolveVideoMimeType('', 'talk.mp4')).toBe('video/mp4')
  })

  it('infers webm from filename when MIME is octet-stream', () => {
    expect(resolveVideoMimeType('application/octet-stream', 'a.webm')).toBe(
      'video/webm',
    )
  })

  it('returns null for unsupported type without a known extension', () => {
    expect(resolveVideoMimeType('video/quicktime', 'clip.mov')).toBeNull()
  })
})

describe('validateVideoUpload', () => {
  it('accepts mp4 under the limit', () => {
    expect(() => validateVideoUpload(0, 'video/mp4', 'a.mp4')).not.toThrow()
  })

  it('accepts webm at exactly 100MB', () => {
    expect(() =>
      validateVideoUpload(VIDEO_MAX_SIZE, 'video/webm', 'a.webm'),
    ).not.toThrow()
  })

  it('accepts empty MIME when filename is .mp4', () => {
    expect(() => validateVideoUpload(1024, '', 'lecture.mp4')).not.toThrow()
  })

  it('rejects over 100MB', () => {
    expect(() =>
      validateVideoUpload(VIDEO_MAX_SIZE + 1, 'video/mp4', 'a.mp4'),
    ).toThrow('File size must be less than 100MB')
  })

  it('rejects unsupported MIME without a known extension', () => {
    expect(() => validateVideoUpload(0, 'video/quicktime', 'a.mov')).toThrow(
      'Only MP4 and WebM videos are allowed',
    )
  })

  it('lists exactly two allowed MIME types', () => {
    expect(VIDEO_MIME_TYPES).toHaveLength(2)
  })
})

describe('shouldRemoveMediaLibraryObject', () => {
  it('is false when youtube stays youtube', () => {
    expect(
      shouldRemoveMediaLibraryObject({
        previousFileType: 'video',
        previousFileUrl: 'https://youtube.com/x',
        nextFileType: 'video',
        nextFileUrl: 'https://youtube.com/y',
      }),
    ).toBe(false)
  })

  it('is true when video_file URL is replaced', () => {
    expect(
      shouldRemoveMediaLibraryObject({
        previousFileType: 'video_file',
        previousFileUrl: 'https://cdn/old.mp4',
        nextFileType: 'video_file',
        nextFileUrl: 'https://cdn/new.mp4',
      }),
    ).toBe(true)
  })

  it('is true when leaving video_file for youtube', () => {
    expect(
      shouldRemoveMediaLibraryObject({
        previousFileType: 'video_file',
        previousFileUrl: 'https://cdn/old.mp4',
        nextFileType: 'video',
        nextFileUrl: 'https://youtube.com/x',
      }),
    ).toBe(true)
  })

  it('is false for video_file metadata-only edit', () => {
    expect(
      shouldRemoveMediaLibraryObject({
        previousFileType: 'video_file',
        previousFileUrl: 'https://cdn/same.mp4',
        nextFileType: 'video_file',
        nextFileUrl: 'https://cdn/same.mp4',
      }),
    ).toBe(false)
  })
})

describe('resolveVideoFileExtension', () => {
  it('prefers MIME over name for webm', () => {
    expect(resolveVideoFileExtension('video/webm', 'x.mp4')).toBe('webm')
  })

  it('prefers MIME over name for mp4', () => {
    expect(resolveVideoFileExtension('video/mp4', 'x.webm')).toBe('mp4')
  })

  it('falls back to filename extension', () => {
    expect(
      resolveVideoFileExtension('application/octet-stream', 'a.webm'),
    ).toBe('webm')
  })

  it('defaults to mp4', () => {
    expect(resolveVideoFileExtension('application/octet-stream', 'a')).toBe(
      'mp4',
    )
  })
})

describe('buildVideoObjectName', () => {
  it('builds userId-timestamp.ext', () => {
    expect(buildVideoObjectName('u1', 'mp4', 1000)).toBe('u1-1000.mp4')
  })
})

describe('isOwnedMediaLibraryObjectUrl', () => {
  it('accepts object named with user prefix', () => {
    const url =
      'https://x.supabase.co/storage/v1/object/public/media-library/user-1-9.mp4'
    expect(isOwnedMediaLibraryObjectUrl(url, 'user-1')).toBe(true)
  })

  it('rejects other user prefix', () => {
    const url =
      'https://x.supabase.co/storage/v1/object/public/media-library/other-9.mp4'
    expect(isOwnedMediaLibraryObjectUrl(url, 'user-1')).toBe(false)
  })

  it('rejects non-library URLs', () => {
    expect(isOwnedMediaLibraryObjectUrl('https://youtube.com/x', 'u')).toBe(
      false,
    )
  })
})

describe('needsSignedViewerUrl', () => {
  it('is true for document and video_file', () => {
    expect(needsSignedViewerUrl('document')).toBe(true)
    expect(needsSignedViewerUrl('video_file')).toBe(true)
  })

  it('is false for youtube video and other types', () => {
    expect(needsSignedViewerUrl('video')).toBe(false)
    expect(needsSignedViewerUrl('audio')).toBe(false)
  })
})
