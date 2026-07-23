// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useVideoFilePick } from './media-dialog.hooks'
import type React from 'react'

describe('useVideoFilePick', () => {
  it('keeps upload handlers stable after selecting a file', () => {
    const { result } = renderHook(() => useVideoFilePick())
    const initialHandleFileChange = result.current.handleFileChange
    const initialClearFile = result.current.clearFile
    const file = new File(['video'], 'lesson.mp4', { type: 'video/mp4' })

    act(() => {
      result.current.handleFileChange({
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>)
    })

    expect(result.current.file).toBe(file)
    expect(result.current.handleFileChange).toBe(initialHandleFileChange)
    expect(result.current.clearFile).toBe(initialClearFile)
  })
})
