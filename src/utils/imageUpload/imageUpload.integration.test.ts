import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../test/integration/db'
import { seedCourse, seedProfile } from '../../../test/integration/seed'
import { resetCreateSignedUrlsMock } from '../../../test/integration/storage-mocks'
import type { AuthorizationService } from '@/utils/authz/types'
import {
  DefaultAuthorizationService,
  setAuthorizationService,
} from '@/utils/authz'
import {
  requestAvatarUploadService,
  requestCourseThumbnailUploadService,
  uploadAvatarService,
  uploadCourseThumbnailService,
} from '@/utils/imageUpload/service/imageUpload.service'
import { AuthorizationError } from '@/utils/errors'
import { withObservabilityRequest } from '@/utils/observability/request-context'
import { courses, profiles } from '@/db/schema'

const mocks = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(),
  createSignedUrls: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/utils/supabase', () => ({
  getSupabaseAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: mocks.createSignedUploadUrl,
        createSignedUrls: mocks.createSignedUrls,
        remove: mocks.remove,
      }),
    },
  }),
}))

const imageInput = {
  fileName: 'photo.png',
  fileType: 'image/png',
  fileSize: 1024,
}

beforeEach(() => {
  mocks.createSignedUploadUrl.mockReset().mockImplementation((path: string) =>
    Promise.resolve({
      data: { path, token: 'tok', signedUrl: 'https://signed-upload' },
      error: null,
    }),
  )
  resetCreateSignedUrlsMock(mocks.createSignedUrls)
  mocks.remove
    .mockReset()
    .mockResolvedValue({ data: [{ name: 'removed' }], error: null })
})

afterEach(() => {
  vi.restoreAllMocks()
  setAuthorizationService(new DefaultAuthorizationService())
})

describe('avatar signed upload', () => {
  it('validates metadata and returns an actor-owned signed upload', async () => {
    const userId = await seedProfile()
    const result = await requestAvatarUploadService(imageInput, userId)

    expect(result.path).toMatch(new RegExp(`^${userId}\\/\\d+-[\\w-]+\\.png$`))
    expect(result.signedUrl).toBe('https://signed-upload')
  })

  it('emits a request-correlated completion event', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const userId = await seedProfile()

    await requestAvatarUploadService(imageInput, userId)

    const entry = JSON.parse(
      infoSpy.mock.calls[infoSpy.mock.calls.length - 1]?.[0] as string,
    )
    expect(entry).toMatchObject({
      event: 'image_upload_completed',
      path: 'serverFn:request_avatar_upload',
      requestId: 'unknown',
      status: 'success',
      bucket: 'avatars',
      userId,
    })
  })

  it('rejects an unknown actor before issuing a signed upload', async () => {
    const userId = '00000000-0000-4000-8000-000000000001'

    await expect(
      requestAvatarUploadService(imageInput, userId),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    expect(mocks.createSignedUploadUrl).not.toHaveBeenCalled()
  })

  it('logs provider failures without exposing the provider message', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const userId = await seedProfile()
    mocks.createSignedUploadUrl.mockResolvedValue({
      data: null,
      error: { message: 'provider secret' },
    })

    await expect(
      requestAvatarUploadService(imageInput, userId),
    ).rejects.toMatchObject({ code: 'STORAGE_UPLOAD_FAILED' })

    const entry = JSON.parse(
      errorSpy.mock.calls[errorSpy.mock.calls.length - 1]?.[0] as string,
    )
    expect(entry).toMatchObject({
      event: 'image_upload_failed',
      path: 'serverFn:request_avatar_upload',
      errorCategory: 'STORAGE_UPLOAD_FAILED',
    })
    expect(entry).not.toHaveProperty('message')
  })

  it('rejects oversized metadata before signing', async () => {
    const userId = await seedProfile()
    await expect(
      requestAvatarUploadService(
        { ...imageInput, fileSize: 3 * 1024 * 1024 },
        userId,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
    expect(mocks.createSignedUploadUrl).not.toHaveBeenCalled()
  })

  it('persists only path and returns a signed display URL', async () => {
    const id = await seedProfile()
    const path = `${id}/123.png`

    const result = await uploadAvatarService({ path }, id)

    expect(result).toEqual({ avatarUrl: `https://signed/${path}` })
    const db = await getDb()
    const row = await db.query.profiles.findFirst({
      where: eq(profiles.id, id),
    })
    expect(row?.avatarUrl).toBe(path)
  })

  it('rejects avatar completion for an unknown actor before persistence', async () => {
    const userId = '00000000-0000-4000-8000-000000000002'

    await expect(
      uploadAvatarService({ path: `${userId}/123.png` }, userId),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(mocks.createSignedUrls).not.toHaveBeenCalled()
  })

  it('rejects a foreign completion path', async () => {
    const id = await seedProfile()
    await expect(
      uploadAvatarService({ path: 'other/123.png' }, id),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })

  it('removes previous object after persisting replacement', async () => {
    const id = await seedProfile()
    const db = await getDb()
    await db
      .update(profiles)
      .set({ avatarUrl: `${id}/old.png` })
      .where(eq(profiles.id, id))

    await uploadAvatarService({ path: `${id}/new.png` }, id)

    expect(mocks.remove).toHaveBeenCalledWith([`${id}/old.png`])
  })

  it('emits a redacted warning when old-object cleanup fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const id = await seedProfile()
    const db = await getDb()
    await db
      .update(profiles)
      .set({ avatarUrl: `${id}/old.png` })
      .where(eq(profiles.id, id))
    mocks.remove.mockResolvedValue({
      data: [],
      error: { message: 'provider secret' },
    })

    await uploadAvatarService({ path: `${id}/new.png` }, id)

    const entry = JSON.parse(
      warnSpy.mock.calls[warnSpy.mock.calls.length - 1]?.[0] as string,
    )
    expect(entry).toMatchObject({
      event: 'storage_object_cleanup_failed',
      path: 'storage:delete_object',
      bucket: 'avatars',
      errorCategory: 'storage_delete',
    })
    expect(entry).not.toHaveProperty('objectPath')
    expect(entry).not.toHaveProperty('message')
  })
})

describe('course thumbnail signed upload', () => {
  it('rejects upload requests for missing courses', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    await expect(
      requestCourseThumbnailUploadService(
        {
          ...imageInput,
          courseId: '00000000-0000-0000-0000-000000000000',
        },
        adminId,
      ),
    ).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' })
  })

  it('persists path for an authorized admin', async () => {
    const adminId = await seedProfile({ role: 'admin' })
    const courseId = await seedCourse()
    const path = `${adminId}/123.png`

    const result = await uploadCourseThumbnailService(
      { courseId, path },
      adminId,
    )

    expect(result).toEqual({ thumbnailUrl: `https://signed/${path}` })
    const db = await getDb()
    const row = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    })
    expect(row?.thumbnailUrl).toBe(path)
  })
})

describe('course thumbnail authorization telemetry', () => {
  it.each([
    {
      name: 'signed upload request',
      path: 'serverFn:request_course_thumbnail_upload',
      run: (courseId: string, userId: string): Promise<unknown> =>
        requestCourseThumbnailUploadService(
          { ...imageInput, courseId },
          userId,
        ),
    },
    {
      name: 'upload completion',
      path: 'serverFn:upload_course_thumbnail',
      run: (courseId: string, userId: string): Promise<unknown> =>
        uploadCourseThumbnailService(
          { courseId, path: `${userId}/123.png` },
          userId,
        ),
    },
  ])(
    'logs unexpected $name authorization failures without raw details',
    async ({ path, run }) => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const userId = await seedProfile({ role: 'teacher' })
      const courseId = await seedCourse()
      const repositoryError = new Error(
        'thumbnail authorization connectionString=secret; email=thumbnail@test.dev',
      )
      setAuthorizationService({
        canPerformAction: vi.fn().mockRejectedValue(repositoryError),
      } as unknown as AuthorizationService)

      await expect(
        withObservabilityRequest(
          new Request('https://christ-dina.org/course-thumbnail', {
            headers: { 'x-request-id': `course-thumbnail-${path}` },
          }),
          () => run(courseId, userId),
        ),
      ).rejects.toBe(repositoryError)

      const line = String(errorSpy.mock.calls.at(-1)?.[0])
      expect(JSON.parse(line)).toMatchObject({
        event: 'image_upload_failed',
        path,
        requestId: `course-thumbnail-${path}`,
        status: 'failure',
        bucket: 'course-thumbnails',
        userId,
        courseId,
        errorCategory: 'course_thumbnail_authorization_persistence',
      })
      expect(line).not.toContain('connectionString')
      expect(line).not.toContain('thumbnail@test.dev')
    },
  )

  it('keeps expected thumbnail authorization denials quiet', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const userId = await seedProfile({ role: 'teacher' })
    const courseId = await seedCourse()
    const denial = new AuthorizationError('course access required')
    setAuthorizationService({
      canPerformAction: vi.fn().mockRejectedValue(denial),
    } as unknown as AuthorizationService)

    await expect(
      requestCourseThumbnailUploadService({ ...imageInput, courseId }, userId),
    ).rejects.toBe(denial)
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
