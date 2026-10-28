// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PdfViewer } from './PdfViewer'

vi.mock('@/components/library/use-pdf-document', () => ({
  usePdfDocument: (url: string) => ({
    pdf: null,
    pageNum: 1,
    setPageNum: vi.fn(),
    numPages: 2,
    loading: false,
    error: false,
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
    if (scrollToDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'scrollTo', scrollToDescriptor)
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
})
