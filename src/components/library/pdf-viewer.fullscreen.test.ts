import { describe, expect, it, vi } from 'vitest'
import { toggleNativePdfFullscreen } from './pdf-viewer.fullscreen'

function createFullscreenState(isFullscreen = false) {
  const container = { requestFullscreen: vi.fn(async () => {}) }
  const fullscreenDocument = {
    fullscreenElement: isFullscreen ? container : null,
    exitFullscreen: vi.fn(async () => {}),
  }
  return { container, fullscreenDocument }
}

describe('toggleNativePdfFullscreen', () => {
  it('enters native fullscreen when the request succeeds', async () => {
    const { container, fullscreenDocument } = createFullscreenState()

    expect(await toggleNativePdfFullscreen(fullscreenDocument, container)).toBe(
      'handled',
    )
    expect(container.requestFullscreen).toHaveBeenCalledOnce()
  })

  it('exits native fullscreen when the viewer is active', async () => {
    const { container, fullscreenDocument } = createFullscreenState(true)

    expect(await toggleNativePdfFullscreen(fullscreenDocument, container)).toBe(
      'handled',
    )
    expect(fullscreenDocument.exitFullscreen).toHaveBeenCalledOnce()
  })

  it('requests fallback when native fullscreen entry is denied', async () => {
    const { container, fullscreenDocument } = createFullscreenState()
    container.requestFullscreen.mockRejectedValue(new Error('Denied'))

    expect(await toggleNativePdfFullscreen(fullscreenDocument, container)).toBe(
      'fallback',
    )
  })

  it('does not overlay fallback when native fullscreen exit fails', async () => {
    const { container, fullscreenDocument } = createFullscreenState(true)
    fullscreenDocument.exitFullscreen.mockRejectedValue(new Error('Denied'))

    expect(await toggleNativePdfFullscreen(fullscreenDocument, container)).toBe(
      'handled',
    )
  })
})
