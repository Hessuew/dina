// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PdfViewer } from './PdfViewer'

const mockPdfDocumentState = vi.hoisted(() => ({ error: false }))

vi.mock('@/components/library/use-pdf-document', () => ({
  usePdfDocument: (url: string) => ({
    pdf: null,
    pageNum: 1,
    setPageNum: vi.fn(),
    numPages: 2,
    loading: false,
    error: mockPdfDocumentState.error,
    retry: vi.fn(),
    docKey: url.split('?')[0],
  }),
}))

describe('PdfViewer document identity', () => {
  const scrollToDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'scrollTo',
  )

  afterEach(() => {
    cleanup()
    mockPdfDocumentState.error = false
    if (scrollToDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'scrollTo',
        scrollToDescriptor,
      )
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
    }
  })

  it('keeps zoom and scroll when a signed URL is reissued for the same document', () => {
    const scrollTo = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    })

    const { rerender } = render(
      <PdfViewer url="https://files.example/book.pdf?signature=first" />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'More reading options' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(
      screen.getByRole('button', { name: 'Reset zoom' }).textContent,
    ).toContain('125%')

    scrollTo.mockClear()
    rerender(
      <PdfViewer url="https://files.example/book.pdf?signature=renewed" />,
    )

    expect(
      screen.getByRole('button', { name: 'Reset zoom' }).textContent,
    ).toContain('125%')
    expect(scrollTo).not.toHaveBeenCalled()

    rerender(
      <PdfViewer url="https://files.example/another-book.pdf?signature=third" />,
    )

    expect(
      screen.getByRole('button', { name: 'Reset zoom' }).textContent,
    ).toContain('100%')
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('restores zoom and scroll after a same-document load error and retry', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    })

    const { container, rerender } = render(
      <PdfViewer url="https://files.example/book.pdf?signature=first" />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'More reading options' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))

    const surface = container.firstChild
    const viewport = container.querySelector('.overflow-auto')
    expect(viewport).not.toBeNull()
    if (!viewport) throw new Error('PDF viewport should be rendered')
    viewport.scrollLeft = 18
    viewport.scrollTop = 42
    fireEvent.scroll(viewport)

    mockPdfDocumentState.error = true
    rerender(<PdfViewer url="https://files.example/book.pdf?signature=first" />)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    // The surface element stays mounted through the error so native and
    // fallback fullscreen survive the retry.
    expect(container.firstChild).toBe(surface)

    mockPdfDocumentState.error = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    rerender(
      <PdfViewer url="https://files.example/book.pdf?signature=renewed" />,
    )

    const remountedViewport = container.querySelector('.overflow-auto')
    expect(remountedViewport).not.toBeNull()
    expect(remountedViewport).not.toBe(viewport)
    expect(remountedViewport?.scrollLeft).toBe(18)
    expect(remountedViewport?.scrollTop).toBe(42)
    expect(
      screen.getByRole('button', { name: 'Reset zoom' }).textContent,
    ).toContain('125%')
  })
})
