// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePdfZoom } from './use-pdf-zoom'
import type { RefObject, UIEvent } from 'react'

describe('usePdfZoom', () => {
  it('preserves zoom across pages and resets page scroll position', () => {
    const scrollTo = vi.fn()
    const viewportRef = {
      current: { scrollTo },
    } as unknown as RefObject<HTMLDivElement | null>
    const { result, rerender } = renderHook(
      ({ pageKey }) => usePdfZoom(viewportRef, 'document:windowed', pageKey),
      { initialProps: { pageKey: 'document:1' } },
    )

    act(() => {
      result.current.zoomIn()
      result.current.zoomIn()
    })
    expect(result.current.zoom).toBe(1.5)

    rerender({ pageKey: 'document:2' })

    expect(result.current.zoom).toBe(1.5)
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0)
  })

  it('resets zoom when the viewer context changes', () => {
    const viewportRef = {
      current: { scrollTo: vi.fn() },
    } as unknown as RefObject<HTMLDivElement | null>
    const { result, rerender } = renderHook(
      ({ zoomKey }) => usePdfZoom(viewportRef, zoomKey, 'document:1'),
      { initialProps: { zoomKey: 'document:windowed' } },
    )

    act(() => result.current.zoomIn())
    expect(result.current.zoom).toBe(1.25)

    rerender({ zoomKey: 'document:fullscreen' })

    expect(result.current.zoom).toBe(1)
  })

  it('restores the same page scroll when the viewport remounts', () => {
    const firstViewport = document.createElement('div')
    const remountedViewport = document.createElement('div')
    const viewportRef = {
      current: null,
    } as RefObject<HTMLDivElement | null>
    const { result } = renderHook(() =>
      usePdfZoom(viewportRef, 'document:windowed', 'document:1'),
    )

    act(() => {
      result.current.attachViewport(firstViewport)
      firstViewport.scrollLeft = 18
      firstViewport.scrollTop = 42
      result.current.onScroll({
        currentTarget: firstViewport,
      } as UIEvent<HTMLDivElement>)
      result.current.attachViewport(null)
      result.current.attachViewport(remountedViewport)
    })

    expect(remountedViewport.scrollLeft).toBe(18)
    expect(remountedViewport.scrollTop).toBe(42)
  })

  it('clears remembered scroll when the page changes', () => {
    const viewport = document.createElement('div')
    const scrollTo = vi.fn((left: number, top: number) => {
      viewport.scrollLeft = left
      viewport.scrollTop = top
    })
    Object.defineProperty(viewport, 'scrollTo', { value: scrollTo })
    const viewportRef = { current: null } as RefObject<HTMLDivElement | null>
    const { result, rerender } = renderHook(
      ({ pageKey }) => usePdfZoom(viewportRef, 'document:windowed', pageKey),
      { initialProps: { pageKey: 'document:1' } },
    )

    act(() => {
      result.current.attachViewport(viewport)
      viewport.scrollLeft = 18
      viewport.scrollTop = 42
      result.current.onScroll({
        currentTarget: viewport,
      } as UIEvent<HTMLDivElement>)
    })

    rerender({ pageKey: 'document:2' })

    expect(scrollTo).toHaveBeenLastCalledWith(0, 0)
    expect(viewport.scrollLeft).toBe(0)
    expect(viewport.scrollTop).toBe(0)
  })
})
