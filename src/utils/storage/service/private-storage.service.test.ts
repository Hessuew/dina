import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPrivateSignedUpload,
  signPrivateStoragePaths,
} from './private-storage.service'

const mocks = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(),
  createSignedUrls: vi.fn(),
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

beforeEach(() => {
  mocks.createSignedUploadUrl.mockReset()
  mocks.createSignedUrls.mockReset()
})

describe('createPrivateSignedUpload', () => {
  it('returns provider upload credentials', async () => {
    mocks.createSignedUploadUrl.mockResolvedValue({
      data: { path: 'u/a.png', token: 'tok', signedUrl: 'https://upload' },
      error: null,
    })

    await expect(
      createPrivateSignedUpload('avatars', 'u/a.png'),
    ).resolves.toEqual({
      path: 'u/a.png',
      token: 'tok',
      signedUrl: 'https://upload',
    })
  })

  it('normalizes provider failure to AppError', async () => {
    mocks.createSignedUploadUrl.mockResolvedValue({
      data: null,
      error: { message: 'storage unavailable' },
    })

    await expect(
      createPrivateSignedUpload('avatars', 'u/a.png'),
    ).rejects.toMatchObject({ code: 'STORAGE_UPLOAD_FAILED', status: 502 })
  })
})

describe('signPrivateStoragePaths', () => {
  it('deduplicates paths and maps signed URLs', async () => {
    mocks.createSignedUrls.mockResolvedValue({
      data: [
        { path: 'a.png', error: null, signedUrl: 'https://signed/a' },
        { path: 'b.png', error: 'missing', signedUrl: '' },
      ],
      error: null,
    })

    const result = await signPrivateStoragePaths('avatars', [
      'a.png',
      'a.png',
      'b.png',
      null,
    ])

    expect(mocks.createSignedUrls).toHaveBeenCalledWith(
      ['a.png', 'b.png'],
      3600,
    )
    expect(result.get('a.png')).toBe('https://signed/a')
    expect(result.get('b.png')).toBeNull()
  })

  it('returns null entries when batch signing fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.createSignedUrls.mockResolvedValue({
      data: null,
      error: { message: 'nope' },
    })

    const result = await signPrivateStoragePaths('avatars', ['a.png'])

    expect(result.get('a.png')).toBeNull()
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('avoids provider call for empty path set', async () => {
    await expect(signPrivateStoragePaths('avatars', [null])).resolves.toEqual(
      new Map(),
    )
    expect(mocks.createSignedUrls).not.toHaveBeenCalled()
  })
})
