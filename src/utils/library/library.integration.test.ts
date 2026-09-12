import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../test/integration/db'
import { seedMedia, seedProfile } from '../../../test/integration/seed'
import { resetCreateSignedUrlsMock } from '../../../test/integration/storage-mocks'
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
  allowsDownload: false,
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
  resetCreateSignedUrlsMock(mocks.createSignedUrls)
  mocks.removeStorageObject.mockReset().mockResolvedValue(undefined)
})

describe('library reads', () => {
  it('filters unpublished rows for students', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    await seedMedia({ uploaderId, isPublished: true })
    await seedMedia({ uploaderId, isPublished: false })

    const result = await getLibraryMediaService(studentId)

    expect(result.media).toHaveLength(1)
    expect(result.viewer).toEqual({ id: studentId, role: 'student' })
  })

  it('rejects unknown actors before reading media', async () => {
    await expect(
      getLibraryMediaService('00000000-0000-4000-8000-000000000099'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
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

    const result = await getLibraryMediaService(uploaderId)

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

    const result = await getLibraryMediaItemService({ mediaId }, uploaderId)

    expect(result.viewerUrl).toBe(`https://signed/${uploaderId}/talk.mp4`)
    expect(result.permissions.canManage).toBe(true)
  })

  it('blocks students from unpublished media', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    const studentId = await seedProfile({ role: 'student' })
    const mediaId = await seedMedia({ uploaderId, isPublished: false })
    await expect(
      getLibraryMediaItemService({ mediaId }, studentId),
    ).rejects.toMatchObject({ code: 'AUTHORIZATION_FAILED' })
  })
})

describe('library persistence', () => {
  it('logs redacted CRUD telemetry with stable media fields', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const ownerId = await seedProfile({ role: 'teacher' })
    const created = await createLibraryMediaService(
      makeCreateInput({
        title: 'Private media title',
        description: 'Private media description',
        url: 'https://private.example/media',
      }),
      ownerId,
    )

    await updateLibraryMediaService(
      {
        ...makeCreateInput({
          title: 'Updated private media title',
          description: 'Updated private media description',
          url: 'https://private.example/updated',
        }),
        mediaId: created.media.id,
      },
      ownerId,
    )
    await deleteLibraryMediaService({ mediaId: created.media.id }, ownerId)

    const lines = infoSpy.mock.calls.map(([line]) => String(line))
    const events = lines.map((line) => JSON.parse(line))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'media_created',
          path: 'serverFn:createLibraryMedia',
          actorId: ownerId,
          mediaId: created.media.id,
          mediaKind: 'youtube',
          status: 'success',
        }),
        expect.objectContaining({
          event: 'media_updated',
          path: 'serverFn:updateLibraryMedia',
          actorId: ownerId,
          mediaId: created.media.id,
          mediaKind: 'youtube',
          status: 'success',
        }),
        expect.objectContaining({
          event: 'media_deleted',
          path: 'serverFn:deleteLibraryMedia',
          actorId: ownerId,
          mediaId: created.media.id,
          status: 'success',
        }),
      ]),
    )
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
    expect(lines.join('\n')).not.toContain('Private media title')
    expect(lines.join('\n')).not.toContain('private.example')
    expect(lines.join('\n')).not.toContain('Private media description')
  })

  it('logs stable persistence failures without raw storage details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ownerId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({
      uploaderId: ownerId,
      fileType: 'document',
      fileUrl: `${ownerId}/private.pdf`,
    })
    mocks.removeStorageObject.mockRejectedValueOnce(
      new Error('private storage provider failure'),
    )

    await expect(
      deleteLibraryMediaService({ mediaId }, ownerId),
    ).rejects.toThrow('private storage provider failure')

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    const event = JSON.parse(line)
    expect(event).toMatchObject({
      event: 'media_mutation_failed',
      path: 'serverFn:deleteLibraryMedia',
      actorId: ownerId,
      mediaId,
      status: 'failure',
      errorCategory: 'media_persistence',
    })
    expect(line).not.toContain('private storage provider failure')
  })

  it('stores YouTube URL separately from private file path', async () => {
    const uploaderId = await seedProfile({ role: 'teacher' })
    const result = await createLibraryMediaService(
      makeCreateInput(),
      uploaderId,
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

    await deleteLibraryMediaService({ mediaId }, ownerId)

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
    const studentId = await seedProfile({ role: 'student' })
    await expect(
      requestMediaFileUploadService(
        {
          kind: 'video-file',
          fileName: 'a.mp4',
          fileType: 'video/mp4',
          fileSize: 1024,
        },
        studentId,
      ),
    ).rejects.toMatchObject({ code: 'ROLE_REQUIRED' })
  })

  it('validates and signs video uploads', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const result = await requestMediaFileUploadService(
      {
        kind: 'video-file',
        fileName: 'talk.mp4',
        fileType: 'video/mp4',
        fileSize: 1024,
      },
      teacherId,
    )

    expect(result.path).toMatch(new RegExp(`^${teacherId}/\\d+-[\\w-]+\\.mp4$`))
    expect(result.signedUrl).toBe('https://signed-upload')
  })

  it('validates and signs document uploads', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    const result = await requestMediaFileUploadService(
      {
        kind: 'document',
        fileName: 'slides.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
      },
      teacherId,
    )

    expect(result.path).toMatch(new RegExp(`^${teacherId}/\\d+-[\\w-]+\\.pdf$`))
  })

  it('rejects disallowed document MIME', async () => {
    const teacherId = await seedProfile({ role: 'teacher' })
    await expect(
      requestMediaFileUploadService(
        {
          kind: 'document',
          fileName: 'x.png',
          fileType: 'image/png',
          fileSize: 1024,
        },
        teacherId,
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

    const result = await uploadMediaThumbnailService({ mediaId, path }, ownerId)

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
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })
})
