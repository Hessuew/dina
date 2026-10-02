import { describe, expect, it } from 'vitest'
import {
  clampPdfZoom,
  resolvePdfPageInput,
  resolvePdfPinchZoom,
  resolvePdfResumePage,
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

describe('resolvePdfResumePage', () => {
  const ready = { docReady: true, alreadyApplied: false }

  it('clamps the stored page to the document bounds', () => {
    expect(
      resolvePdfResumePage({ ...ready, initialPage: 42, numPages: 100 }),
    ).toBe(42)
    expect(
      resolvePdfResumePage({ ...ready, initialPage: 101, numPages: 100 }),
    ).toBe(100)
    expect(
      resolvePdfResumePage({ ...ready, initialPage: 0, numPages: 100 }),
    ).toBe(1)
  })

  it('waits until prefs provide an initial page and the doc is loaded', () => {
    expect(
      resolvePdfResumePage({ ...ready, initialPage: null, numPages: 100 }),
    ).toBeNull()
    expect(
      resolvePdfResumePage({ ...ready, initialPage: 5, numPages: 0 }),
    ).toBeNull()
    expect(
      resolvePdfResumePage({
        initialPage: 5,
        numPages: 100,
        docReady: false,
        alreadyApplied: false,
      }),
    ).toBeNull()
  })

  it('applies only once', () => {
    expect(
      resolvePdfResumePage({
        initialPage: 5,
        numPages: 100,
        docReady: true,
        alreadyApplied: true,
      }),
    ).toBeNull()
  })
})
