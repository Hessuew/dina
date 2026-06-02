import { describe, expect, it } from 'vitest'
import type { MediaLibraryRow } from '@/utils/library/library'
import { ValidationError } from '@/utils/errors'
import {
  DOCUMENT_MIME_TYPES,
  buildMediaListItems,
  canManageMedia,
  extractPdfFilePath,
  toFileType,
  validatePdfUpload,
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

describe('extractPdfFilePath', () => {
  it('extracts path from /object/public/ URL', () => {
    const url =
      'https://project.supabase.co/storage/v1/object/public/media-library/some/path.pdf'
    expect(extractPdfFilePath(url)).toBe('some/path.pdf')
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
