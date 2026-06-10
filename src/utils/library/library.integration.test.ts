import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../test/integration/db'
import { seedMedia, seedProfile } from '../../../test/integration/seed'
import type { CreateMediaInput } from '@/schemas/media.schema'
import {
  createLibraryMediaService,
  deleteLibraryMediaService,
  getLibraryMediaItemService,
  getLibraryMediaService,
  updateLibraryMediaService,
  uploadMediaPdfService,
  uploadMediaThumbnailService,
} from '@/utils/library/service/library.service'
import { mediaLibrary } from '@/db/schema'

// Library services do external IO PGlite can't run: Supabase Storage (signed URLs
// for documents, PDF upload) and the imageUpload service (thumbnail conversion).
// We mock ONLY those boundaries; the DB stays real so the repository SQL + authz
// orchestration are exercised for real. See docs/TESTING_GUIDE.md / ADR 0009.
const mocks = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  remove: vi.fn(),
  uploadImageService: vi.fn(),
}))

vi.mock('@/utils/supabase', () => ({
  getSupabaseAdminClient: () => ({
    storage: { from: () => ({ createSignedUrl: mocks.createSignedUrl }) },
  }),
  getSupabaseServerClient: () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        getPublicUrl: mocks.getPublicUrl,
        remove: mocks.remove,
      }),
    },
  }),
}))

vi.mock('@/utils/imageUpload/service/imageUpload.service', () => ({
  uploadImageService: mocks.uploadImageService,
}))

const makeCreateInput = (
  overrides: Partial<CreateMediaInput> = {},
): CreateMediaInput => ({
  title: 'A Talk',
  description: 'desc',
  category: 'Wisdom',
  isPublished: true,
  kind: 'youtube',
  url: 'https://youtube.com/watch?v=abc',
  ...overrides,
})

const findMedia = async (id: string) => {
  const db = await getDb()
  return db.query.mediaLibrary.findFirst({ where: eq(mediaLibrary.id, id) })
}

beforeEach(() => {
  mocks.createSignedUrl.mockReset().mockResolvedValue({
    data: { signedUrl: 'https://signed/url' },
    error: null,
  })
  mocks.upload.mockReset().mockResolvedValue({ error: null })
  mocks.getPublicUrl.mockReset().mockReturnValue({
    data: { publicUrl: 'https://host/media-library/x.pdf' },
  })
  mocks.remove.mockReset().mockResolvedValue({ error: null })
  mocks.uploadImageService
    .mockReset()
    .mockResolvedValue({ imageUrl: 'https://host/thumb.webp' })
})

describe('getLibraryMediaService (integration)', () => {
  it('returns only published rows to a student', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    await seedMedia({ uploaderId, isPublished: true })
    await seedMedia({ uploaderId, isPublished: false })

    const result = await getLibraryMediaService('student-1', 'student')

    expect(result.media).toHaveLength(1)
    expect(result.viewer).toEqual({ id: 'student-1', role: 'student' })
  })

  it('returns all rows to a teacher', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    await seedMedia({ uploaderId, isPublished: true })
    await seedMedia({ uploaderId, isPublished: false })

    const result = await getLibraryMediaService(uploaderId, 'teacher')

    expect(result.media).toHaveLength(2)
  })
})

describe('getLibraryMediaItemService (integration)', () => {
  it('throws NotFoundError for a missing item', async () => {
    await expect(
      getLibraryMediaItemService(
        { mediaId: '00000000-0000-0000-0000-000000000000' },
        'user-1',
        'teacher',
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 })
  })

  it('blocks a student from an unpublished item', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({ uploaderId, isPublished: false })

    await expect(
      getLibraryMediaItemService({ mediaId }, 'student-1', 'student'),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED', status: 403 })
  })

  it('returns a signed viewer URL for a document', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({
      uploaderId,
      isPublished: true,
      fileType: 'document',
      fileUrl:
        'https://x.supabase.co/storage/v1/object/public/media-library/doc.pdf',
    })

    const result = await getLibraryMediaItemService(
      { mediaId },
      uploaderId,
      'teacher',
    )

    expect(mocks.createSignedUrl).toHaveBeenCalledWith('doc.pdf', 3600)
    expect(result.viewerUrl).toBe('https://signed/url')
    expect(result.permissions.canManage).toBe(true)
    expect(result.viewer).toEqual({ id: uploaderId, role: 'teacher' })
  })
})

describe('createLibraryMediaService (integration)', () => {
  it('rejects a student', async () => {
    await expect(
      createLibraryMediaService(makeCreateInput(), 'student-1', 'student'),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED', status: 403 })
  })

  it('inserts a row for a teacher', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })

    const result = await createLibraryMediaService(
      makeCreateInput({ title: 'Created' }),
      uploaderId,
      'teacher',
    )

    const row = await findMedia(result.media.id)
    expect(row?.title).toBe('Created')
    expect(row?.uploaderId).toBe(uploaderId)
    expect(row?.fileType).toBe('video') // kind 'youtube' -> 'video'
  })
})

describe('updateLibraryMediaService (integration)', () => {
  it('rejects a student', async () => {
    await expect(
      updateLibraryMediaService(
        {
          ...makeCreateInput(),
          mediaId: '00000000-0000-0000-0000-000000000000',
        },
        'student-1',
        'student',
      ),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED' })
  })

  it('throws NotFoundError for a missing item', async () => {
    await expect(
      updateLibraryMediaService(
        {
          ...makeCreateInput(),
          mediaId: '00000000-0000-0000-0000-000000000000',
        },
        'teacher-1',
        'teacher',
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('blocks a non-owner teacher', async () => {
    const ownerId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({ uploaderId: ownerId })

    await expect(
      updateLibraryMediaService(
        { ...makeCreateInput(), mediaId },
        'other-teacher',
        'teacher',
      ),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED' })
  })

  it('updates a row for its owner', async () => {
    const ownerId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({ uploaderId: ownerId, title: 'Old' })

    await updateLibraryMediaService(
      { ...makeCreateInput({ title: 'New Title' }), mediaId },
      ownerId,
      'teacher',
    )

    const row = await findMedia(mediaId)
    expect(row?.title).toBe('New Title')
  })
})

describe('deleteLibraryMediaService (integration)', () => {
  it('rejects a student', async () => {
    await expect(
      deleteLibraryMediaService(
        { mediaId: '00000000-0000-0000-0000-000000000000' },
        'student-1',
        'student',
      ),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED' })
  })

  it('throws NotFoundError for a missing item', async () => {
    await expect(
      deleteLibraryMediaService(
        { mediaId: '00000000-0000-0000-0000-000000000000' },
        'teacher-1',
        'teacher',
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('blocks a non-owner teacher', async () => {
    const ownerId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({ uploaderId: ownerId })

    await expect(
      deleteLibraryMediaService({ mediaId }, 'other-teacher', 'teacher'),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED' })
  })

  it('deletes for an admin regardless of owner', async () => {
    const ownerId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({ uploaderId: ownerId })

    const result = await deleteLibraryMediaService(
      { mediaId },
      'admin-1',
      'admin',
    )

    expect(result).toEqual({ success: true })
    expect(await findMedia(mediaId)).toBeUndefined()
  })
})

describe('uploadMediaPdfService (integration)', () => {
  const pdfInput = {
    fileData: Buffer.from('pdf-bytes').toString('base64'),
    fileName: 'slides.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
  }

  it('rejects a student', async () => {
    await expect(
      uploadMediaPdfService(pdfInput, 'student-1', 'student'),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED' })
  })

  it('rejects a disallowed file type', async () => {
    await expect(
      uploadMediaPdfService(
        { ...pdfInput, fileType: 'image/png' },
        'teacher-1',
        'teacher',
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('uploads and returns the public URL', async () => {
    const result = await uploadMediaPdfService(pdfInput, 'teacher-1', 'teacher')

    expect(mocks.upload).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      success: true,
      fileUrl: 'https://host/media-library/x.pdf',
    })
  })
})

describe('uploadMediaThumbnailService (integration)', () => {
  it('rejects a student', async () => {
    await expect(
      uploadMediaThumbnailService(
        {
          mediaId: '00000000-0000-0000-0000-000000000000',
          fileData: 'x',
          fileName: 't.png',
          fileType: 'image/png',
          fileSize: 1024,
        },
        'student-1',
        'student',
      ),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED' })
  })

  it('throws NotFoundError for a missing item', async () => {
    await expect(
      uploadMediaThumbnailService(
        {
          mediaId: '00000000-0000-0000-0000-000000000000',
          fileData: 'x',
          fileName: 't.png',
          fileType: 'image/png',
          fileSize: 1024,
        },
        'teacher-1',
        'teacher',
      ),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('uploads and persists the thumbnail URL', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({ uploaderId })

    const result = await uploadMediaThumbnailService(
      {
        mediaId,
        fileData: 'x',
        fileName: 't.png',
        fileType: 'image/png',
        fileSize: 1024,
      },
      uploaderId,
      'teacher',
    )

    expect(mocks.uploadImageService).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ thumbnailUrl: 'https://host/thumb.webp' })
    const row = await findMedia(mediaId)
    expect(row?.thumbnailUrl).toBe('https://host/thumb.webp')
  })
})
