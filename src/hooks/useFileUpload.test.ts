// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFileUpload } from './useFileUpload'
import type React from 'react'

const createObjectURL = vi.fn()
const revokeObjectURL = vi.fn()

Object.defineProperty(URL, 'createObjectURL', {
  configurable: true,
  value: createObjectURL,
})
Object.defineProperty(URL, 'revokeObjectURL', {
  configurable: true,
  value: revokeObjectURL,
})

function pickFile(
  handler: (event: React.ChangeEvent<HTMLInputElement>) => void,
  file: File,
) {
  handler({
    target: { files: [file] },
  } as unknown as React.ChangeEvent<HTMLInputElement>)
}

describe('useFileUpload', () => {
  beforeEach(() => {
    createObjectURL.mockReset()
    revokeObjectURL.mockReset()
  })

  it('keeps upload handlers stable after selecting a file', () => {
    createObjectURL.mockReturnValue('blob:preview')
    const { result } = renderHook(() => useFileUpload())
    const initialHandleFileChange = result.current.handleFileChange
    const initialClearFile = result.current.clearFile
    const file = new File(['image'], 'thumbnail.png', { type: 'image/png' })

    act(() => pickFile(result.current.handleFileChange, file))

    expect(result.current.fileObject).toBe(file)
    expect(result.current.fileData).toBe('blob:preview')
    expect(result.current.handleFileChange).toBe(initialHandleFileChange)
    expect(result.current.clearFile).toBe(initialClearFile)
  })

  it('revokes replaced and cleared preview URLs', () => {
    createObjectURL
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second')
    const { result } = renderHook(() => useFileUpload())

    act(() =>
      pickFile(
        result.current.handleFileChange,
        new File(['first'], 'first.png', { type: 'image/png' }),
      ),
    )
    act(() =>
      pickFile(
        result.current.handleFileChange,
        new File(['second'], 'second.png', { type: 'image/png' }),
      ),
    )
    act(() => result.current.clearFile())

    expect(revokeObjectURL).toHaveBeenNthCalledWith(1, 'blob:first')
    expect(revokeObjectURL).toHaveBeenNthCalledWith(2, 'blob:second')
    expect(result.current.fileObject).toBeNull()
    expect(result.current.fileData).toBeNull()
  })

  it('revokes the active preview URL on unmount', () => {
    createObjectURL.mockReturnValue('blob:preview')
    const { result, unmount } = renderHook(() => useFileUpload())

    act(() =>
      pickFile(
        result.current.handleFileChange,
        new File(['image'], 'thumbnail.png', { type: 'image/png' }),
      ),
    )
    unmount()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })
})
