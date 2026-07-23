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
  requestMediaFileUploadService,
  requestMediaThumbnailUploadService,
  updateLibraryMediaService,
  uploadMediaThumbnailService,
} from '@/utils/library/service/library.service'
import { mediaLibrary } from '@/db/schema'

const mocks = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(),
  createSignedUrls: vi.fn(),
  removeStorageObject: vi.fn(),
}))

vi.mock('@/utils/supabase', () => ({
  getSupabaseAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: mocks.createSignedUploadUrl,
        createSignedUrls: mocks.createSignedUrls,
      }),
    },
  }),
}))

vi.mock('@/utils/imageUpload/service/imageUpload.service', () => ({
  deleteStorageObject: mocks.removeStorageObject,
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
  mocks.createSignedUploadUrl.mockReset().mockImplementation((path: string) =>
    Promise.resolve({
      data: { path, token: 'tok', signedUrl: 'https://signed-upload' },
      error: null,
    }),
  )
  mocks.createSignedUrls
    .mockReset()
    .mockImplementation((paths: Array<string>) =>
      Promise.resolve({
        data: paths.map((path) => ({
          path,
          error: null,
          signedUrl: `https://signed/${path}`,
        })),
        error: null,
      }),
    )
  mocks.removeStorageObject.mockReset().mockResolvedValue(undefined)
})

describe('library reads', () => {
  it('filters unpublished rows for students', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    await seedMedia({ uploaderId, isPublished: true })
    await seedMedia({ uploaderId, isPublished: false })

    const result = await getLibraryMediaService('student-1', 'student')

    expect(result.media).toHaveLength(1)
    expect(result.viewer).toEqual({ id: 'student-1', role: 'student' })
  })

  it('signs private file and thumbnail paths in response DTOs', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    await seedMedia({
      uploaderId,
      fileType: 'document',
      fileUrl: `${uploaderId}/doc.pdf`,
      thumbnailUrl: `${uploaderId}/thumb.png`,
      isPublished: true,
    })

    const result = await getLibraryMediaService(uploaderId, 'teacher')

    expect(result.media[0].fileUrl).toBe(`https://signed/${uploaderId}/doc.pdf`)
    expect(result.media[0].thumbnailUrl).toBe(
      `https://signed/${uploaderId}/thumb.png`,
    )
  })

  it('returns signed viewer URL and permissions for uploaded media', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({
      uploaderId,
      fileType: 'video_file',
      fileUrl: `${uploaderId}/talk.mp4`,
      isPublished: true,
    })

    const result = await getLibraryMediaItemService(
      { mediaId },
      uploaderId,
      'teacher',
    )

    expect(result.viewerUrl).toBe(`https://signed/${uploaderId}/talk.mp4`)
    expect(result.permissions.canManage).toBe(true)
  })

  it('blocks students from unpublished media', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({ uploaderId, isPublished: false })
    await expect(
      getLibraryMediaItemService({ mediaId }, 'student-1', 'student'),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED' })
  })
})

describe('library persistence', () => {
  it('stores YouTube URL separately from private file path', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    const result = await createLibraryMediaService(
      makeCreateInput(),
      uploaderId,
      'teacher',
    )

    const row = await findMedia(result.media.id)
    expect(row?.externalUrl).toBe('https://youtube.com/watch?v=abc')
    expect(row?.filePath).toBeNull()
  })

  it('stores only canonical owned path for uploaded media', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    const path = `${uploaderId}/talk.mp4`
    const result = await createLibraryMediaService(
      makeCreateInput({ kind: 'video-file', url: path, fileSize: 1024 }),
      uploaderId,
      'teacher',
    )

    const row = await findMedia(result.media.id)
    expect(row?.externalUrl).toBeNull()
    expect(row?.filePath).toBe(path)
    expect(row?.fileSize).toBe(1024)
  })

  it('canonicalizes a signed object URL before persistence', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    const signed =
      `https://x.supabase.co/storage/v1/object/sign/media-library/` +
      `${uploaderId}/talk.mp4?token=x`
    const result = await createLibraryMediaService(
      makeCreateInput({ kind: 'video-file', url: signed }),
      uploaderId,
      'teacher',
    )

    expect((await findMedia(result.media.id))?.filePath).toBe(
      `${uploaderId}/talk.mp4`,
    )
  })

  it('rejects foreign upload paths', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    await expect(
      createLibraryMediaService(
        makeCreateInput({ kind: 'video-file', url: 'other/talk.mp4' }),
        uploaderId,
        'teacher',
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })

  it('preserves file size for metadata-only edit', async () => {
    const ownerId = await seedProfile({ role: 'teacher' })
    const path = `${ownerId}/talk.mp4`
    const mediaId = await seedMedia({
      uploaderId: ownerId,
      fileType: 'video_file',
      fileUrl: path,
      fileSize: 4096,
    })

    await updateLibraryMediaService(
      {
        ...makeCreateInput({ kind: 'video-file', url: path }),
        mediaId,
      },
      ownerId,
      'teacher',
    )

    expect((await findMedia(mediaId))?.fileSize).toBe(4096)
    expect(mocks.removeStorageObject).not.toHaveBeenCalled()
  })

  it('removes replaced private object after update', async () => {
    const ownerId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({
      uploaderId: ownerId,
      fileType: 'video_file',
      fileUrl: `${ownerId}/old.mp4`,
    })

    await updateLibraryMediaService(
      {
        ...makeCreateInput({
          kind: 'youtube',
          url: 'https://youtube.com/watch?v=new',
        }),
        mediaId,
      },
      ownerId,
      'teacher',
    )

    expect(mocks.removeStorageObject).toHaveBeenCalledWith(
      'media-library',
      `${ownerId}/old.mp4`,
    )
  })

  it('removes file and thumbnail when deleting row', async () => {
    const ownerId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({
      uploaderId: ownerId,
      fileType: 'document',
      fileUrl: `${ownerId}/doc.pdf`,
      thumbnailUrl: `${ownerId}/thumb.png`,
    })

    await deleteLibraryMediaService({ mediaId }, ownerId, 'teacher')

    expect(mocks.removeStorageObject).toHaveBeenCalledWith(
      'media-library',
      `${ownerId}/doc.pdf`,
    )
    expect(mocks.removeStorageObject).toHaveBeenCalledWith(
      'media-thumbnails',
      `${ownerId}/thumb.png`,
    )
  })
})

describe('signed file upload requests', () => {
  it('rejects students', async () => {
    await expect(
      requestMediaFileUploadService(
        {
          kind: 'video-file',
          fileName: 'a.mp4',
          fileType: 'video/mp4',
          fileSize: 1024,
        },
        'student-1',
        'student',
      ),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED' })
  })

  it('validates and signs video uploads', async () => {
    const result = await requestMediaFileUploadService(
      {
        kind: 'video-file',
        fileName: 'talk.mp4',
        fileType: 'video/mp4',
        fileSize: 1024,
      },
      'teacher-1',
      'teacher',
    )

    expect(result.path).toMatch(/^teacher-1\/\d+-[\w-]+\.mp4$/)
    expect(result.signedUrl).toBe('https://signed-upload')
  })

  it('validates and signs document uploads', async () => {
    const result = await requestMediaFileUploadService(
      {
        kind: 'document',
        fileName: 'slides.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
      },
      'teacher-1',
      'teacher',
    )

    expect(result.path).toMatch(/^teacher-1\/\d+-[\w-]+\.pdf$/)
  })

  it('rejects disallowed document MIME', async () => {
    await expect(
      requestMediaFileUploadService(
        {
          kind: 'document',
          fileName: 'x.png',
          fileType: 'image/png',
          fileSize: 1024,
        },
        'teacher-1',
        'teacher',
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })
})

describe('media thumbnail completion', () => {
  it('signs request only for media owner', async () => {
    const ownerId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({ uploaderId: ownerId })

    const result = await requestMediaThumbnailUploadService(
      {
        mediaId,
        fileName: 'thumb.png',
        fileType: 'image/png',
        fileSize: 1024,
      },
      ownerId,
      'teacher',
    )

    expect(result.path).toMatch(new RegExp(`^${ownerId}/\\d+-[\\w-]+\\.png$`))
  })

  it('persists path, signs response, and removes prior thumbnail', async () => {
    const ownerId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({
      uploaderId: ownerId,
      thumbnailUrl: `${ownerId}/old.png`,
    })
    const path = `${ownerId}/new.png`

    const result = await uploadMediaThumbnailService(
      { mediaId, path },
      ownerId,
      'teacher',
    )

    expect(result).toEqual({ thumbnailUrl: `https://signed/${path}` })
    expect((await findMedia(mediaId))?.thumbnailUrl).toBe(path)
    expect(mocks.removeStorageObject).toHaveBeenCalledWith(
      'media-thumbnails',
      `${ownerId}/old.png`,
    )
  })

  it('rejects foreign completion path', async () => {
    const ownerId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({ uploaderId: ownerId })
    await expect(
      uploadMediaThumbnailService(
        { mediaId, path: 'other/thumb.png' },
        ownerId,
        'teacher',
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })
})
