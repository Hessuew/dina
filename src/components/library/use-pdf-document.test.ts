// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePdfDocument } from './use-pdf-document'
import type { PDFDocumentProxy } from 'pdfjs-dist'

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  invalidate: vi.fn(),
}))

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: mocks.getDocument,
  GlobalWorkerOptions: {},
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mocks.invalidate }),
}))

const URL_A =
  'https://x.supabase.co/storage/v1/object/sign/media-library/u1/book.pdf?token=AAA'
const URL_A_RESIGNED =
  'https://x.supabase.co/storage/v1/object/sign/media-library/u1/book.pdf?token=BBB'
const URL_B =
  'https://x.supabase.co/storage/v1/object/sign/media-library/u1/other.pdf?token=CCC'

type Doc = { numPages: number }

function fakeTask() {
  let resolve!: (doc: Doc) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<Doc>((res, rej) => {
    resolve = res
    reject = rej
  })
  const task = {
    promise,
    destroy: vi.fn(() => Promise.resolve()),
  }
  mocks.getDocument.mockReturnValueOnce(task)
  return { task, resolve, reject }
}

function fakeDoc(numPages: number): PDFDocumentProxy {
  return { numPages } as PDFDocumentProxy
}

describe('usePdfDocument', () => {
  beforeEach(() => {
    mocks.getDocument.mockReset()
    mocks.invalidate.mockReset()
    mocks.invalidate.mockResolvedValue(undefined)
  })

  it('loads the document and clears the loading state', async () => {
    const first = fakeTask()
    const { result } = renderHook(() => usePdfDocument(URL_A))

    await act(async () => {
      first.resolve(fakeDoc(7))
      await first.task.promise
    })

    expect(result.current.pdf?.numPages).toBe(7)
    expect(result.current.numPages).toBe(7)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(false)
  })

  it('flags an error when the load fails', async () => {
    const first = fakeTask()
    const { result } = renderHook(() => usePdfDocument(URL_A))

    await act(async () => {
      first.reject(new Error('network'))
      await first.task.promise.catch(() => {})
    })

    expect(result.current.error).toBe(true)
    expect(result.current.loading).toBe(false)
    expect(result.current.pdf).toBeNull()
  })

  it('preserves the reader page across a re-issued URL for the same document', async () => {
    const first = fakeTask()
    const { result, rerender } = renderHook(({ url }) => usePdfDocument(url), {
      initialProps: { url: URL_A },
    })
    await act(async () => {
      first.resolve(fakeDoc(10))
      await first.task.promise
    })
    act(() => result.current.setPageNum(5))

    const second = fakeTask()
    rerender({ url: URL_A_RESIGNED })
    await act(async () => {
      second.resolve(fakeDoc(10))
      await second.task.promise
    })

    expect(result.current.pageNum).toBe(5)
    expect(result.current.error).toBe(false)
    expect(first.task.destroy).toHaveBeenCalled()
  })

  it('resets to page one when the URL is a different document', async () => {
    const first = fakeTask()
    const { result, rerender } = renderHook(({ url }) => usePdfDocument(url), {
      initialProps: { url: URL_A },
    })
    await act(async () => {
      first.resolve(fakeDoc(10))
      await first.task.promise
    })
    act(() => result.current.setPageNum(5))

    const second = fakeTask()
    rerender({ url: URL_B })
    await act(async () => {
      second.resolve(fakeDoc(3))
      await second.task.promise
    })

    expect(result.current.pageNum).toBe(1)
    expect(result.current.pdf?.numPages).toBe(3)
  })

  it('ignores a superseded task rejection so the new document is not masked', async () => {
    const first = fakeTask()
    const { result, rerender } = renderHook(({ url }) => usePdfDocument(url), {
      initialProps: { url: URL_A },
    })

    const second = fakeTask()
    rerender({ url: URL_A_RESIGNED })

    await act(async () => {
      // destroy() rejects the old task's promise after the new load began.
      first.reject(new Error('Worker was destroyed'))
      second.resolve(fakeDoc(4))
      await second.task.promise
    })

    expect(result.current.error).toBe(false)
    expect(result.current.pdf?.numPages).toBe(4)
  })

  it('ignores a superseded task resolution instead of installing an obsolete doc', async () => {
    const first = fakeTask()
    const { result, rerender } = renderHook(({ url }) => usePdfDocument(url), {
      initialProps: { url: URL_A },
    })

    const second = fakeTask()
    rerender({ url: URL_B })

    await act(async () => {
      first.resolve(fakeDoc(99))
      second.resolve(fakeDoc(4))
      await second.task.promise
    })

    expect(result.current.pdf?.numPages).toBe(4)
    expect(result.current.numPages).toBe(4)
  })

  it('re-runs the route loader on retry and reloads when the reissue is byte-identical', async () => {
    const first = fakeTask()
    const { result } = renderHook(() => usePdfDocument(URL_A))
    await act(async () => {
      first.reject(new Error('network'))
      await first.task.promise.catch(() => {})
    })
    expect(result.current.error).toBe(true)
    mocks.getDocument.mockClear()

    const second = fakeTask()
    act(() => result.current.retry())
    await act(async () => {})

    // Same-second re-signing returns the identical URL — the retry still
    // drives a fresh load rather than leaving the error pinned.
    expect(mocks.invalidate).toHaveBeenCalledTimes(1)
    expect(mocks.getDocument).toHaveBeenCalledTimes(1)
    expect(mocks.getDocument).toHaveBeenLastCalledWith({ url: URL_A })

    await act(async () => {
      second.resolve(fakeDoc(7))
      await second.task.promise
    })
    expect(result.current.error).toBe(false)
    expect(result.current.pdf?.numPages).toBe(7)
  })

  it('reloads only against the freshly issued URL after retry', async () => {
    const first = fakeTask()
    const { result, rerender } = renderHook(({ url }) => usePdfDocument(url), {
      initialProps: { url: URL_A },
    })
    await act(async () => {
      first.reject(new Error('network'))
      await first.task.promise.catch(() => {})
    })
    mocks.getDocument.mockClear()

    const second = fakeTask()
    act(() => {
      result.current.retry()
      rerender({ url: URL_A_RESIGNED })
    })
    await act(async () => {})

    // The changed URL drives the load itself — no duplicate task, and no
    // task goes out against the stale URL.
    expect(mocks.invalidate).toHaveBeenCalledTimes(1)
    expect(mocks.getDocument).not.toHaveBeenCalledWith({ url: URL_A })
    expect(mocks.getDocument).toHaveBeenCalledTimes(1)
    expect(mocks.getDocument).toHaveBeenLastCalledWith({
      url: URL_A_RESIGNED,
    })

    await act(async () => {
      second.resolve(fakeDoc(10))
      await second.task.promise
    })
    expect(result.current.error).toBe(false)
    expect(result.current.pdf?.numPages).toBe(10)
  })

  it('clamps a preserved page to the newly loaded document length', async () => {
    const first = fakeTask()
    const { result, rerender } = renderHook(({ url }) => usePdfDocument(url), {
      initialProps: { url: URL_A },
    })
    await act(async () => {
      first.resolve(fakeDoc(10))
      await first.task.promise
    })
    act(() => result.current.setPageNum(8))

    const second = fakeTask()
    rerender({ url: URL_A_RESIGNED })
    await act(async () => {
      second.resolve(fakeDoc(3))
      await second.task.promise
    })

    expect(result.current.pageNum).toBe(3)
    expect(result.current.numPages).toBe(3)
    expect(result.current.error).toBe(false)
  })

  it('flags an error when getDocument throws synchronously', () => {
    mocks.getDocument.mockImplementationOnce(() => {
      throw new Error('invalid url')
    })
    const { result } = renderHook(() => usePdfDocument(URL_A))

    expect(result.current.error).toBe(true)
    expect(result.current.loading).toBe(false)
  })
})
