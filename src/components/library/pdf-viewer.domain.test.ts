import { describe, expect, it } from 'vitest'
import {
  clampPdfZoom,
  resolvePdfPageInput,
  resolvePdfPinchZoom,
} from './pdf-viewer.domain'

describe('resolvePdfPageInput', () => {
  it('accepts a page within the document', () => {
    expect(resolvePdfPageInput('42', 100, 7)).toBe(42)
  })

  it('clamps pages to the document bounds', () => {
    expect(resolvePdfPageInput('0', 100, 7)).toBe(1)
    expect(resolvePdfPageInput('101', 100, 7)).toBe(100)
  })

  it.each(['', 'page 4', '2.5'])('keeps the current page for %j', (value) => {
    expect(resolvePdfPageInput(value, 100, 7)).toBe(7)
  })
})

describe('PDF zoom', () => {
  it('clamps zoom between 100% and 400%', () => {
    expect(clampPdfZoom(0.5)).toBe(1)
    expect(clampPdfZoom(2.5)).toBe(2.5)
    expect(clampPdfZoom(5)).toBe(4)
  })

  it('derives zoom from pinch distance', () => {
    expect(resolvePdfPinchZoom(1.5, 100, 200)).toBe(3)
    expect(resolvePdfPinchZoom(3, 100, 200)).toBe(4)
  })

  it('keeps zoom when pinch distance is invalid', () => {
    expect(resolvePdfPinchZoom(2, 0, 100)).toBe(2)
    expect(resolvePdfPinchZoom(2, 100, 0)).toBe(2)
  })
})
