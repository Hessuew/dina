// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePdfZoom } from './use-pdf-zoom'
import type { RefObject } from 'react'

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
})
