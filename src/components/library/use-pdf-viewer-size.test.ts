// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useViewerSize } from './use-pdf-viewer-size'

class MockResizeObserver {
  static instances: Array<MockResizeObserver> = []
  observed = new Set<Element>()
  disconnected = false
  private callback: () => void

  constructor(callback: () => void) {
    this.callback = callback
    MockResizeObserver.instances.push(this)
  }

  observe(element: Element) {
    this.observed.add(element)
  }

  unobserve(element: Element) {
    this.observed.delete(element)
  }

  disconnect() {
    this.disconnected = true
  }

  trigger() {
    this.callback()
  }
}

vi.stubGlobal('ResizeObserver', MockResizeObserver)

function viewerNode(width: number): HTMLDivElement {
  const node = document.createElement('div')
  Object.defineProperty(node, 'clientWidth', {
    value: width,
    configurable: true,
  })
  return node
}

describe('useViewerSize', () => {
  beforeEach(() => {
    MockResizeObserver.instances = []
  })

  it('measures the mounted container and observes it for resizes', () => {
    const node = viewerNode(640)
    const { result } = renderHook(() => useViewerSize(node, false))

    expect(result.current.width).toBe(640)
    expect(MockResizeObserver.instances).toHaveLength(1)
    expect(MockResizeObserver.instances[0].observed.has(node)).toBe(true)
  })

  it('remeasures and reconnects the observer when the surface remounts', () => {
    const first = viewerNode(640)
    const remounted = viewerNode(920)
    const { result, rerender } = renderHook(
      ({ container }) => useViewerSize(container, false),
      { initialProps: { container: first as HTMLDivElement | null } },
    )

    rerender({ container: null })
    expect(MockResizeObserver.instances[0].disconnected).toBe(true)

    rerender({ container: remounted })

    const latest =
      MockResizeObserver.instances[MockResizeObserver.instances.length - 1]
    expect(latest).not.toBe(MockResizeObserver.instances[0])
    expect(latest.observed.has(remounted)).toBe(true)
    expect(result.current.width).toBe(920)
  })

  it('updates the size when the window resizes', () => {
    const node = viewerNode(640)
    const { result } = renderHook(() => useViewerSize(node, false))

    Object.defineProperty(node, 'clientWidth', { value: 700 })
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current.width).toBe(700)
  })
})
