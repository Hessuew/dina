import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../test/integration/db'
import {
  seedCourse,
  seedMedia,
  seedProfile,
} from '../../../test/integration/seed'
import { resetCreateSignedUrlsMock } from '../../../test/integration/storage-mocks'
import type { CreateMediaInput } from '@/schemas/media.schema'
import { withObservabilityRequest } from '@/utils/observability/request-context'
import * as authUtils from '@/utils/auth/auth'
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
import * as mediaRepository from '@/utils/repository'

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
  it('composes course metadata from the shared course repository', async () => {
    const ownerId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse({ title: 'Course A', orderIndex: 2 })
    await seedMedia({ uploaderId: ownerId, courseId })

    const result = await getLibraryMediaService(ownerId)

    expect(result.media[0]).toMatchObject({
      courseId,
      courseName: 'Course A',
      courseNumber: 3,
    })
  })

  it('logs redacted list and detail read telemetry', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const ownerId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({
      uploaderId: ownerId,
      title: 'Private media title',
      description: 'Private media description',
      fileType: 'document',
      fileUrl: `${ownerId}/private.pdf`,
      thumbnailUrl: `${ownerId}/private.png`,
      isPublished: true,
    })

    await getLibraryMediaService(ownerId)
    await getLibraryMediaItemService({ mediaId }, ownerId)

    const lines = infoSpy.mock.calls.map(([line]) => String(line))
    const events = lines.map((line) => JSON.parse(line))
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'library_media_loaded',
          path: 'serverFn:getLibraryMedia',
          actorId: ownerId,
          role: 'teacher',
          mediaCount: 1,
          publishedOnly: false,
          status: 'success',
        }),
        expect.objectContaining({
          event: 'library_media_loaded',
          path: 'serverFn:getLibraryMediaItem',
          actorId: ownerId,
          mediaId,
          role: 'teacher',
          mediaPublished: true,
          fileType: 'document',
          canManage: true,
          hasViewerUrl: true,
          status: 'success',
        }),
      ]),
    )
    expect(events.every((event) => typeof event.durationMs === 'number')).toBe(
      true,
    )
    expect(lines.join('\n')).not.toContain('Private media title')
    expect(lines.join('\n')).not.toContain('Private media description')
    expect(lines.join('\n')).not.toContain(`${ownerId}/private.pdf`)
    expect(lines.join('\n')).not.toContain(`${ownerId}/private.png`)
    infoSpy.mockRestore()
  })

  it('logs stable read failures without raw storage details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ownerId = await seedProfile({ role: 'teacher' })
    await seedMedia({
      uploaderId: ownerId,
      fileType: 'document',
      fileUrl: `${ownerId}/private.pdf`,
    })
    mocks.createSignedUrls.mockRejectedValueOnce(
      new Error('private storage signing failure'),
    )

    await expect(getLibraryMediaService(ownerId)).rejects.toThrow(
      'private storage signing failure',
    )

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    const event = JSON.parse(line)
    expect(event).toMatchObject({
      event: 'library_media_load_failed',
      path: 'serverFn:getLibraryMedia',
      actorId: ownerId,
      status: 'failure',
      errorCategory: 'library_media_read_persistence',
    })
    expect(line).not.toContain('private storage signing failure')
    expect(line).not.toContain(`${ownerId}/private.pdf`)
    errorSpy.mockRestore()
  })

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

  it.each<{
    name: string
    path: string
    run: (mediaId: string, ownerId: string) => Promise<unknown>
  }>([
    {
      name: 'update',
      path: 'serverFn:updateLibraryMedia',
      run: (mediaId: string, ownerId: string) =>
        updateLibraryMediaService({ ...makeCreateInput(), mediaId }, ownerId),
    },
    {
      name: 'delete',
      path: 'serverFn:deleteLibraryMedia',
      run: (mediaId: string, ownerId: string) =>
        deleteLibraryMediaService({ mediaId }, ownerId),
    },
    {
      name: 'thumbnail upload',
      path: 'serverFn:uploadMediaThumbnail',
      run: (mediaId: string, ownerId: string) =>
        uploadMediaThumbnailService(
          { mediaId, path: `${ownerId}/new.png` },
          ownerId,
        ),
    },
  ])(
    'logs managed-media $name preflight failures without raw details',
    async ({ path, run }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const ownerId = await seedProfile({ role: 'teacher' })
      const mediaId = '00000000-0000-4000-8000-000000000003'
      const repositoryError = new Error(
        'media lookup connectionString=secret; email=private@test.dev',
      )
      vi.spyOn(mediaRepository, 'findMediaById').mockRejectedValueOnce(
        repositoryError,
      )

      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org/library', {
            headers: { 'x-request-id': `media-preflight-${path}` },
          }),
          () => run(mediaId, ownerId),
        ),
      ).rejects.toBe(repositoryError)

      const line = String(errorSpy.mock.calls.at(-1)?.[0])
      expect(line).not.toContain('connectionString')
      expect(line).not.toContain('private@test.dev')
      expect(JSON.parse(line)).toMatchObject({
        event: 'media_mutation_failed',
        path,
        actorId: ownerId,
        mediaId,
        status: 'failure',
        errorCategory: 'media_read_persistence',
        durationMs: expect.any(Number),
      })
    },
  )

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

  it('validates and signs video uploads with safe telemetry', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    const result = await withObservabilityRequest(
      new Request('https://christ-dina.org/library', {
        headers: { 'x-request-id': 'media-file-upload-request' },
      }),
      () =>
        requestMediaFileUploadService(
          {
            kind: 'video-file',
            fileName: 'talk.mp4',
            fileType: 'video/mp4',
            fileSize: 1024,
          },
          teacherId,
        ),
    )

    expect(result.path).toMatch(new RegExp(`^${teacherId}/\\d+-[\\w-]+\\.mp4$`))
    expect(result.signedUrl).toBe('https://signed-upload')
    const line = String(infoSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('talk.mp4')
    expect(line).not.toContain(result.path)
    expect(JSON.parse(line)).toMatchObject({
      event: 'media_upload_url_issued',
      path: 'serverFn:requestMediaFileUpload',
      requestId: 'media-file-upload-request',
      actorId: teacherId,
      bucket: 'media-library',
      mediaKind: 'video-file',
      status: 'success',
      durationMs: expect.any(Number),
    })
    infoSpy.mockRestore()
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

  it('logs stable signed-upload failures without storage details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const teacherId = await seedProfile({ role: 'teacher' })
    mocks.createSignedUploadUrl.mockRejectedValueOnce(
      new Error('connectionString=secret while signing media path'),
    )

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/library', {
          headers: { 'x-request-id': 'media-file-upload-failure' },
        }),
        () =>
          requestMediaFileUploadService(
            {
              kind: 'document',
              fileName: 'private.pdf',
              fileType: 'application/pdf',
              fileSize: 1024,
            },
            teacherId,
          ),
      ),
    ).rejects.toThrow('connectionString=secret while signing media path')

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('connectionString')
    expect(line).not.toContain('private.pdf')
    expect(JSON.parse(line)).toMatchObject({
      event: 'media_upload_url_issue_failed',
      path: 'serverFn:requestMediaFileUpload',
      requestId: 'media-file-upload-failure',
      actorId: teacherId,
      bucket: 'media-library',
      mediaKind: 'document',
      status: 'failure',
      errorCategory: 'media_upload_request_persistence',
      durationMs: expect.any(Number),
    })
    errorSpy.mockRestore()
  })

  it('logs create actor-profile preflight failures without raw details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const actorId = '00000000-0000-4000-8000-000000000007'
    const repositoryError = new Error(
      'actor profile connectionString=secret; email=owner@test.dev',
    )
    vi.spyOn(authUtils, 'getUserProfile').mockRejectedValueOnce(repositoryError)

    await expect(
      withObservabilityRequest(
        new Request('https://christ-dina.org/library', {
          headers: { 'x-request-id': 'media-create-profile-failure' },
        }),
        () => createLibraryMediaService(makeCreateInput(), actorId),
      ),
    ).rejects.toBe(repositoryError)

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('connectionString')
    expect(line).not.toContain('owner@test.dev')
    expect(JSON.parse(line)).toMatchObject({
      event: 'media_mutation_failed',
      path: 'serverFn:createLibraryMedia',
      requestId: 'media-create-profile-failure',
      actorId,
      status: 'failure',
      errorCategory: 'media_persistence',
      durationMs: expect.any(Number),
    })
  })
})

describe('media thumbnail completion', () => {
  it('signs request only for media owner with safe telemetry', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const ownerId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({ uploaderId: ownerId })

    const result = await withObservabilityRequest(
      new Request('https://christ-dina.org/library', {
        headers: { 'x-request-id': 'media-thumbnail-upload-request' },
      }),
      () =>
        requestMediaThumbnailUploadService(
          {
            mediaId,
            fileName: 'thumb.png',
            fileType: 'image/png',
            fileSize: 1024,
          },
          ownerId,
        ),
    )

    expect(result.path).toMatch(new RegExp(`^${ownerId}/\\d+-[\\w-]+\\.png$`))
    const line = String(infoSpy.mock.calls.at(-1)?.[0])
    expect(line).not.toContain('thumb.png')
    expect(line).not.toContain(result.path)
    expect(JSON.parse(line)).toMatchObject({
      event: 'media_upload_url_issued',
      path: 'serverFn:requestMediaThumbnailUpload',
      requestId: 'media-thumbnail-upload-request',
      actorId: ownerId,
      mediaId,
      bucket: 'media-thumbnails',
      status: 'success',
      durationMs: expect.any(Number),
    })
    infoSpy.mockRestore()
  })

  it('persists path, signs response, and removes prior thumbnail', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
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
    const lines = infoSpy.mock.calls.map(([line]) => String(line))
    const event = lines
      .map((line) => JSON.parse(line))
      .find((entry) => entry.event === 'media_thumbnail_uploaded')
    expect(event).toMatchObject({
      event: 'media_thumbnail_uploaded',
      path: 'serverFn:uploadMediaThumbnail',
      actorId: ownerId,
      mediaId,
      status: 'success',
      replacedThumbnail: true,
      signed: true,
    })
    expect(event.durationMs).toEqual(expect.any(Number))
    expect(lines.join('\n')).not.toContain(`${ownerId}/old.png`)
    expect(lines.join('\n')).not.toContain(path)
    infoSpy.mockRestore()
  })

  it('logs stable thumbnail failures without storage paths', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const ownerId = await seedProfile({ role: 'teacher' })
    const mediaId = await seedMedia({
      uploaderId: ownerId,
      thumbnailUrl: `${ownerId}/old.png`,
    })
    const path = `${ownerId}/new.png`
    mocks.removeStorageObject.mockRejectedValueOnce(
      new Error('thumbnail storage provider failure'),
    )

    await expect(
      uploadMediaThumbnailService({ mediaId, path }, ownerId),
    ).rejects.toThrow('thumbnail storage provider failure')

    const line = String(errorSpy.mock.calls.at(-1)?.[0])
    const event = JSON.parse(line)
    expect(event).toMatchObject({
      event: 'media_thumbnail_upload_failed',
      path: 'serverFn:uploadMediaThumbnail',
      actorId: ownerId,
      mediaId,
      status: 'failure',
      errorCategory: 'media_thumbnail_persistence',
    })
    expect(line).not.toContain('thumbnail storage provider failure')
    expect(line).not.toContain(`${ownerId}/old.png`)
    expect(line).not.toContain(path)
    errorSpy.mockRestore()
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
