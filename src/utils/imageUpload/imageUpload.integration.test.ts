import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../test/integration/db'
import { seedCourse, seedProfile } from '../../../test/integration/seed'
import { resetCreateSignedUrlsMock } from '../../../test/integration/storage-mocks'
import {
  requestAvatarUploadService,
  requestCourseThumbnailUploadService,
  uploadAvatarService,
  uploadCourseThumbnailService,
} from '@/utils/imageUpload/service/imageUpload.service'
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
})

describe('avatar signed upload', () => {
  it('validates metadata and returns an actor-owned signed upload', async () => {
    const result = await requestAvatarUploadService(imageInput, 'user-1')

    expect(result.path).toMatch(/^user-1\/\d+-[\w-]+\.png$/)
    expect(result.signedUrl).toBe('https://signed-upload')
  })

  it('emits a request-correlated completion event', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    await requestAvatarUploadService(imageInput, 'user-1')

    const entry = JSON.parse(
      infoSpy.mock.calls[infoSpy.mock.calls.length - 1]?.[0] as string,
    )
    expect(entry).toMatchObject({
      event: 'image_upload_completed',
      path: 'serverFn:request_avatar_upload',
      requestId: 'unknown',
      status: 'success',
      bucket: 'avatars',
      userId: 'user-1',
    })
  })

  it('logs provider failures without exposing the provider message', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.createSignedUploadUrl.mockResolvedValue({
      data: null,
      error: { message: 'provider secret' },
    })

    await expect(
      requestAvatarUploadService(imageInput, 'user-1'),
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
    await expect(
      requestAvatarUploadService(
        { ...imageInput, fileSize: 3 * 1024 * 1024 },
        'user-1',
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
