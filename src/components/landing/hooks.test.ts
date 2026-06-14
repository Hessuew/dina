// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useCarousel } from './hooks'

describe('useCarousel', () => {
  it('starts at index 0', () => {
    const { result } = renderHook(() => useCarousel(3))

    expect(result.current.activeIndex).toBe(0)
  })

  it('goToNext advances and wraps to 0 past the last item', () => {
    const { result } = renderHook(() => useCarousel(3))

    act(() => result.current.goToNext())
    expect(result.current.activeIndex).toBe(1)

    act(() => {
      result.current.goToNext()
      result.current.goToNext()
    })
    expect(result.current.activeIndex).toBe(0)
  })

  it('goToPrevious wraps to the last item from index 0', () => {
    const { result } = renderHook(() => useCarousel(3))

    act(() => result.current.goToPrevious())
    expect(result.current.activeIndex).toBe(2)
  })

  it('setActiveIndex jumps directly to a given index', () => {
    const { result } = renderHook(() => useCarousel(5))

    act(() => result.current.setActiveIndex(3))
    expect(result.current.activeIndex).toBe(3)
  })
})
