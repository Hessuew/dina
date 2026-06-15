import { beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'

import { getDb } from '../../../test/integration/db'
import { seedCourse, seedProfile } from '../../../test/integration/seed'
import {
  uploadAvatarService,
  uploadCourseThumbnailService,
  uploadImageService,
} from '@/utils/imageUpload/service/imageUpload.service'
import { courses, profiles } from '@/db/schema'

// imageUpload's service does heavy/external IO (sharp WebP conversion + Supabase
// Storage) that PGlite can't run. We mock ONLY those two boundaries; the DB stays
// real, so the avatar/course thumbnail persistence is exercised for real.
// See docs/TESTING_GUIDE.md / ADR 0009.
const mocks = vi.hoisted(() => ({
  remove: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  // Old-object deletion now runs through the service-role admin client, so it
  // has its own remove mock distinct from the RLS-bound user client above.
  adminRemove: vi.fn(),
}))

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    webp: () => ({
      toBuffer: () => Promise.resolve(Buffer.from('webp-bytes')),
    }),
  })),
}))

vi.mock('@/utils/supabase', () => ({
  getSupabaseServerClient: () => ({
    storage: {
      from: () => ({
        remove: mocks.remove,
        upload: mocks.upload,
        getPublicUrl: mocks.getPublicUrl,
      }),
    },
  }),
  getSupabaseAdminClient: () => ({
    storage: {
      from: () => ({
        remove: mocks.adminRemove,
      }),
    },
  }),
}))

const PUBLIC_URL = 'https://host/bucket/uploaded.webp'
const FILE_DATA = Buffer.from('image-bytes').toString('base64')

const makeInput = <const T extends object = object>(
  overrides?: T,
): {
  fileData: string
  fileName: string
  fileType: string
  fileSize: number
} & T => ({
  fileData: FILE_DATA,
  fileName: 'photo.png',
  fileType: 'image/png',
  fileSize: 1024,
  ...(overrides ?? ({} as T)),
})

beforeEach(() => {
  mocks.remove.mockReset().mockResolvedValue({ error: null })
  mocks.upload.mockReset().mockResolvedValue({ error: null })
  mocks.getPublicUrl
    .mockReset()
    .mockReturnValue({ data: { publicUrl: PUBLIC_URL } })
  mocks.adminRemove
    .mockReset()
    .mockResolvedValue({ data: [{ name: 'removed' }], error: null })
})

describe('uploadImageService (integration)', () => {
  it('uploads and returns the public URL', async () => {
    const result = await uploadImageService(
      makeInput({ bucket: 'avatars' }),
      'user-1',
    )

    expect(result).toEqual({ imageUrl: PUBLIC_URL })
    expect(mocks.upload).toHaveBeenCalledTimes(1)
  })

  it('rejects an oversized file without uploading', async () => {
    await expect(
      uploadImageService(
        makeInput({ bucket: 'avatars', fileSize: 3 * 1024 * 1024 }),
        'user-1',
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED', status: 400 })

    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('rejects a disallowed file type without uploading', async () => {
    await expect(
      uploadImageService(
        makeInput({ bucket: 'avatars', fileType: 'application/pdf' }),
        'user-1',
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })

    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('throws AppError when storage upload fails', async () => {
    mocks.upload.mockResolvedValue({ error: { message: 'boom' } })

    await expect(
      uploadImageService(makeInput({ bucket: 'avatars' }), 'user-1'),
    ).rejects.toMatchObject({ code: 'STORAGE_UPLOAD_FAILED', status: 500 })
  })
})

describe('uploadAvatarService (integration)', () => {
  async function setupOldAvatar(id: string) {
    const db = await getDb()
    await db
      .update(profiles)
      .set({ avatarUrl: 'https://host/avatars/old.webp' })
      .where(eq(profiles.id, id))
  }

  it('persists the avatar URL on the profile', async () => {
    const id = await seedProfile()

    const result = await uploadAvatarService(makeInput(), id)

    expect(result).toEqual({ avatarUrl: PUBLIC_URL })
    const db = await getDb()
    const row = await db.query.profiles.findFirst({
      where: eq(profiles.id, id),
    })
    expect(row?.avatarUrl).toBe(PUBLIC_URL)
  })

  it('removes the previous avatar object via the admin client after uploading', async () => {
    const id = await seedProfile()
    await setupOldAvatar(id)

    await uploadAvatarService(makeInput(), id)

    expect(mocks.adminRemove).toHaveBeenCalledWith(['old.webp'])
    // Cleanup must run only after the new object is uploaded.
    expect(mocks.upload.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.adminRemove.mock.invocationCallOrder[0],
    )
  })

  it('keeps the upload successful when old-image cleanup fails', async () => {
    const id = await seedProfile()
    await setupOldAvatar(id)
    mocks.adminRemove.mockResolvedValue({
      data: null,
      error: { message: 'forbidden' },
    })

    const result = await uploadAvatarService(makeInput(), id)

    expect(result).toEqual({ avatarUrl: PUBLIC_URL })
    const db = await getDb()
    const row = await db.query.profiles.findFirst({
      where: eq(profiles.id, id),
    })
    expect(row?.avatarUrl).toBe(PUBLIC_URL)
  })

  it('does not delete the old avatar when the upload fails', async () => {
    const id = await seedProfile()
    await setupOldAvatar(id)
    mocks.upload.mockResolvedValue({ error: { message: 'boom' } })

    await expect(uploadAvatarService(makeInput(), id)).rejects.toMatchObject({
      code: 'STORAGE_UPLOAD_FAILED',
    })

    expect(mocks.adminRemove).not.toHaveBeenCalled()
    const db = await getDb()
    const row = await db.query.profiles.findFirst({
      where: eq(profiles.id, id),
    })
    expect(row?.avatarUrl).toBe('https://host/avatars/old.webp')
  })
})

describe('uploadCourseThumbnailService (integration)', () => {
  it('persists the thumbnail URL on the course', async () => {
    const courseId = await seedCourse()

    const result = await uploadCourseThumbnailService(
      makeInput({ courseId }),
      'user-1',
    )

    expect(result).toEqual({ thumbnailUrl: PUBLIC_URL })
    const db = await getDb()
    const row = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    })
    expect(row?.thumbnailUrl).toBe(PUBLIC_URL)
  })

  it('throws NotFoundError for a missing course and does not upload', async () => {
    await expect(
      uploadCourseThumbnailService(
        makeInput({ courseId: '00000000-0000-0000-0000-000000000000' }),
        'user-1',
      ),
    ).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND', status: 404 })

    expect(mocks.upload).not.toHaveBeenCalled()
  })
})
