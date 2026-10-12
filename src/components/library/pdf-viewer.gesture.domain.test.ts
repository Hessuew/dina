import { describe, expect, it } from 'vitest'
import { classifyPdfGesture } from './pdf-viewer.gesture.domain'
import type { PdfGestureSample } from './pdf-viewer.gesture.domain'

function sample(overrides: Partial<PdfGestureSample>): PdfGestureSample {
  return {
    pointerCount: 1,
    startX: 100,
    startY: 100,
    endX: 100,
    endY: 100,
    durationMs: 100,
    zoom: 1,
    ...overrides,
  }
}

describe('classifyPdfGesture', () => {
  it('classifies a quick stationary press as a tap', () => {
    expect(classifyPdfGesture(sample({}))).toBe('tap')
    expect(classifyPdfGesture(sample({ endX: 105, durationMs: 249 }))).toBe(
      'tap',
    )
  })

  it('rejects presses that are too slow or too far', () => {
    expect(classifyPdfGesture(sample({ durationMs: 300 }))).toBeNull()
    expect(classifyPdfGesture(sample({ endX: 120 }))).toBeNull()
  })

  it('classifies horizontal swipes by direction at zoom 1', () => {
    expect(classifyPdfGesture(sample({ endX: 20 }))).toBe('swipe-next')
    expect(classifyPdfGesture(sample({ endX: 200 }))).toBe('swipe-prev')
  })

  it('ignores swipes when zoomed in — panning owns the gesture', () => {
    expect(classifyPdfGesture(sample({ endX: 20, zoom: 2 }))).toBeNull()
  })

  it('rejects short or mostly-vertical swipes', () => {
    expect(classifyPdfGesture(sample({ endX: 140 }))).toBeNull()
    expect(classifyPdfGesture(sample({ endX: 20, endY: 160 }))).toBeNull()
  })

  it('ignores multi-pointer gestures — pinch owns them', () => {
    expect(classifyPdfGesture(sample({ pointerCount: 2, endX: 20 }))).toBeNull()
    expect(classifyPdfGesture(sample({ pointerCount: 0 }))).toBeNull()
  })
})
