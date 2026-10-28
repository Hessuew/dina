// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePdfFullscreen } from './use-pdf-fullscreen'

function fullscreenableNode(): HTMLDivElement {
  const node = document.createElement('div')
  Object.defineProperty(node, 'requestFullscreen', {
    value: vi.fn(() => Promise.resolve()),
  })
  return node
}

function setFullscreenElement(element: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', {
    value: element,
    configurable: true,
  })
}

describe('usePdfFullscreen', () => {
  afterEach(() => {
    setFullscreenElement(null)
    document.body.style.overflow = ''
    vi.unstubAllGlobals()
  })

  it('reports support only while the container can request fullscreen', () => {
    Object.defineProperty(document, 'exitFullscreen', {
      value: vi.fn(() => Promise.resolve()),
      configurable: true,
    })
    const node = fullscreenableNode()
    const plain = document.createElement('div')
    const { result, rerender } = renderHook(
      ({ container }) => usePdfFullscreen(container),
      { initialProps: { container: node as HTMLDivElement | null } },
    )

    expect(result.current.isFullscreen).toBe(false)

    // Surface remounts onto a node without fullscreen support.
    rerender({ container: plain })

    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.isFullscreen).toBe(false)
  })

  it('does not report fullscreen when the viewer container is missing', () => {
    const { result, rerender } = renderHook(
      ({ container }) => usePdfFullscreen(container),
      {
        initialProps: {
          container: document.createElement('div') as HTMLDivElement | null,
        },
      },
    )

    rerender({ container: null })

    expect(result.current.isFullscreen).toBe(false)
  })

  it('reconnects the fullscreenchange listener to the remounted node', () => {
    Object.defineProperty(document, 'exitFullscreen', {
      value: vi.fn(() => Promise.resolve()),
      configurable: true,
    })
    const first = fullscreenableNode()
    const remounted = fullscreenableNode()
    const { result, rerender } = renderHook(
      ({ container }) => usePdfFullscreen(container),
      { initialProps: { container: first as HTMLDivElement | null } },
    )

    setFullscreenElement(remounted)
    rerender({ container: remounted })
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.isFullscreen).toBe(true)

    setFullscreenElement(null)
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.isFullscreen).toBe(false)
  })

  it('exits a stranded fallback fullscreen when the surface unmounts', () => {
    const node = document.createElement('div')
    const { result, rerender } = renderHook(
      ({ container }) => usePdfFullscreen(container),
      { initialProps: { container: node as HTMLDivElement | null } },
    )

    // No fullscreen support → toggle enters the fixed-overlay fallback.
    act(() => result.current.toggle())
    expect(result.current.isFallbackFullscreen).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')

    // The error state unmounts the surface: the fallback must not strand.
    rerender({ container: null })

    expect(result.current.isFallbackFullscreen).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })
})
