// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useImportEbooks } from './use-import-ebooks'
import { parsePdfWithoutRendering } from './pdf-parser'

vi.mock('./pdf-parser', () => ({
  parsePdfWithoutRendering: vi.fn(),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function pdf(contents: string) {
  const value = new File([contents], 'Book.pdf', { type: 'application/pdf' })
  Object.defineProperty(value, 'arrayBuffer', {
    value: () => Promise.resolve(new TextEncoder().encode(contents).buffer),
  })
  return value
}

function renderImporter() {
  return renderHook(() =>
    useImportEbooks({
      media: [],
      io: { upload: vi.fn(), create: vi.fn() },
      onComplete: vi.fn(),
    }),
  )
}

describe('useImportEbooks validation lifecycle', () => {
  beforeEach(() => vi.mocked(parsePdfWithoutRendering).mockReset())

  it('uses a topic chosen while validation is running', async () => {
    const parsing = deferred<{ numPages: number }>()
    vi.mocked(parsePdfWithoutRendering).mockReturnValue(parsing.promise)
    const { result } = renderImporter()

    let selection!: Promise<void>
    act(() => {
      selection = result.current.selectFiles([pdf('first')])
    })
    await waitFor(() => expect(parsePdfWithoutRendering).toHaveBeenCalledOnce())
    act(() => result.current.setCategory('Wisdom'))
    await act(async () => {
      parsing.resolve({ numPages: 1 })
      await selection
    })

    expect(result.current.rows[0]).toMatchObject({
      validation: 'valid',
      included: true,
    })
  })

  it('ignores a stale validation after reset and reselection', async () => {
    const first = deferred<{ numPages: number }>()
    const second = deferred<{ numPages: number }>()
    vi.mocked(parsePdfWithoutRendering)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
    const { result } = renderImporter()

    let firstSelection!: Promise<void>
    act(() => {
      firstSelection = result.current.selectFiles([pdf('first')])
    })
    await waitFor(() =>
      expect(parsePdfWithoutRendering).toHaveBeenCalledTimes(1),
    )
    act(() => result.current.reset())

    let secondSelection!: Promise<void>
    act(() => {
      secondSelection = result.current.selectFiles([pdf('second')])
    })
    await waitFor(() =>
      expect(parsePdfWithoutRendering).toHaveBeenCalledTimes(2),
    )
    await act(async () => {
      first.reject(new Error('stale PDF failure'))
      await firstSelection
    })
    expect(result.current.rows[0].validation).toBe('validating')
    expect(result.current.rows[0]).not.toHaveProperty('validationMessage')

    await act(async () => {
      second.resolve({ numPages: 1 })
      await secondSelection
    })
    expect(result.current.rows[0]).toMatchObject({
      validation: 'valid',
      included: true,
    })
  })
})
