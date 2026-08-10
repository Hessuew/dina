import type { Mock } from 'vitest'

/** Default createSignedUrls implementation for integration storage mocks. */
export function mockCreateSignedUrlsSuccess(paths: Array<string>) {
  return Promise.resolve({
    data: paths.map((path) => ({
      path,
      error: null,
      signedUrl: `https://signed/${path}`,
    })),
    error: null,
  })
}

/** Reset a createSignedUrls mock to the default success implementation. */
export function resetCreateSignedUrlsMock(fn: Mock) {
  return fn.mockReset().mockImplementation(mockCreateSignedUrlsSuccess)
}
