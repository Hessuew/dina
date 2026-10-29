// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaDetailViewer } from './MediaDetailViewer'

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mocks.invalidate }),
}))

const OFFICE_MEDIA = {
  title: 'Lecture deck',
  description: null,
  fileType: 'document',
  fileUrl: 'media-library/u1/deck.docx',
  allowsDownload: false,
} as const

const VIDEO_MEDIA = {
  title: 'Recital clip',
  description: null,
  fileType: 'video_file',
  fileUrl: 'media-library/u1/recital.mp4',
  allowsDownload: false,
} as const

const PDF_MEDIA = {
  title: 'Songbook',
  description: null,
  fileType: 'document',
  fileUrl: 'media-library/u1/songbook.pdf',
  allowsDownload: false,
} as const

afterEach(cleanup)

const SIGNED_A =
  'https://x.supabase.co/storage/v1/object/sign/media-library/u1/deck.docx?token=AAA'
const SIGNED_B =
  'https://x.supabase.co/storage/v1/object/sign/media-library/u1/deck.docx?token=BBB'

function renderViewer(viewerUrl: string | null) {
  return render(
    createElement(MediaDetailViewer, {
      media: OFFICE_MEDIA,
      viewerUrl,
    }),
  )
}

describe('MediaDetailViewer office recovery', () => {
  beforeEach(() => {
    mocks.invalidate.mockReset()
    mocks.invalidate.mockResolvedValue(undefined)
  })

  it('keeps a persistent retry action that reissues the signed URL and remounts the iframe', async () => {
    const { container, rerender, getByRole } = renderViewer(SIGNED_A)

    const firstIframe = container.querySelector('iframe')
    expect(firstIframe?.getAttribute('src')).toContain('token%3DAAA')

    fireEvent.click(getByRole('button', { name: /try again/i }))
    expect(mocks.invalidate).toHaveBeenCalledTimes(1)
    await act(async () => {})

    rerender(
      createElement(MediaDetailViewer, {
        media: OFFICE_MEDIA,
        viewerUrl: SIGNED_B,
      }),
    )

    const remountedIframe = container.querySelector('iframe')
    expect(remountedIframe).not.toBe(firstIframe)
    expect(remountedIframe?.getAttribute('src')).toContain('token%3DBBB')
  })

  it('remounts the iframe when the loader reissues a byte-identical URL', async () => {
    const { container, getByRole } = renderViewer(SIGNED_A)
    const firstIframe = container.querySelector('iframe')

    fireEvent.click(getByRole('button', { name: /try again/i }))
    await act(async () => {})

    // Same-second re-signing returns the identical URL — the retry still
    // remounts the embed rather than leaving the first failure in place.
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBe(firstIframe)
    expect(iframe?.getAttribute('src')).toContain('token%3DAAA')
  })

  it('offers retry when the signed URL is missing', async () => {
    const { getByRole, getByText } = renderViewer(null)

    expect(getByText('Document unavailable.')).toBeTruthy()
    fireEvent.click(getByRole('button', { name: /try again/i }))
    await act(async () => {})
    expect(mocks.invalidate).toHaveBeenCalledTimes(1)
  })
})

describe('MediaDetailViewer uploaded-video recovery', () => {
  beforeEach(() => {
    mocks.invalidate.mockReset()
    mocks.invalidate.mockResolvedValue(undefined)
  })

  it('surfaces a playback failure and recovers as soon as a fresh URL arrives', () => {
    const { container, rerender, getByText } = render(
      createElement(MediaDetailViewer, {
        media: VIDEO_MEDIA,
        viewerUrl: SIGNED_A,
      }),
    )

    const video = container.querySelector('video')
    expect(video?.getAttribute('src')).toBe(SIGNED_A)

    fireEvent.error(video!)

    expect(getByText('Video unavailable.')).toBeTruthy()
    expect(container.querySelector('video')).toBeNull()

    // A freshly issued URL recovers in the same render — no stale error frame.
    rerender(
      createElement(MediaDetailViewer, {
        media: VIDEO_MEDIA,
        viewerUrl: SIGNED_B,
      }),
    )

    const recovered = container.querySelector('video')
    expect(recovered?.getAttribute('src')).toBe(SIGNED_B)
  })

  it('recovers through retry when the loader reissues a byte-identical URL', async () => {
    const { container, getByRole, getByText, queryByText } = render(
      createElement(MediaDetailViewer, {
        media: VIDEO_MEDIA,
        viewerUrl: SIGNED_A,
      }),
    )

    const failedVideo = container.querySelector('video')
    expect(failedVideo?.getAttribute('src')).toBe(SIGNED_A)
    fireEvent.error(failedVideo!)
    expect(getByText('Video unavailable.')).toBeTruthy()

    fireEvent.click(getByRole('button', { name: /try again/i }))
    await act(async () => {})

    // The identical reissue remounts the element so the browser re-attempts
    // the resource — a same-src element would otherwise keep its error state.
    expect(queryByText('Video unavailable.')).toBeNull()
    const video = container.querySelector('video')
    expect(video).not.toBe(failedVideo)
    expect(video?.getAttribute('src')).toBe(SIGNED_A)
  })

  it('offers retry when the signed URL is missing', async () => {
    const { getByRole, getByText } = render(
      createElement(MediaDetailViewer, {
        media: VIDEO_MEDIA,
        viewerUrl: null,
      }),
    )

    expect(getByText('Video unavailable.')).toBeTruthy()
    fireEvent.click(getByRole('button', { name: /try again/i }))
    await act(async () => {})
    expect(mocks.invalidate).toHaveBeenCalledTimes(1)
  })
})

describe('MediaDetailViewer pdf recovery', () => {
  beforeEach(() => {
    mocks.invalidate.mockReset()
    mocks.invalidate.mockResolvedValue(undefined)
  })

  it('offers retry when the signed URL is missing', async () => {
    const { getByRole, getByText } = render(
      createElement(MediaDetailViewer, {
        media: PDF_MEDIA,
        viewerUrl: null,
      }),
    )

    expect(getByText('Document unavailable.')).toBeTruthy()
    fireEvent.click(getByRole('button', { name: /try again/i }))
    await act(async () => {})
    expect(mocks.invalidate).toHaveBeenCalledTimes(1)
  })
})
