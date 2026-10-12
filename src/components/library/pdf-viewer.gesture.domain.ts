const PDF_TAP_MAX_MS = 250
const PDF_TAP_MAX_PX = 10
const PDF_SWIPE_MIN_PX = 60
const PDF_SWIPE_AXIS_RATIO = 1.5

export type PdfGesture = 'tap' | 'swipe-next' | 'swipe-prev' | null

export type PdfGestureSample = {
  pointerCount: number
  startX: number
  startY: number
  endX: number
  endY: number
  durationMs: number
  zoom: number
}

export function classifyPdfGesture(sample: PdfGestureSample): PdfGesture {
  if (sample.pointerCount !== 1) return null
  const dx = sample.endX - sample.startX
  const dy = sample.endY - sample.startY
  const distance = Math.hypot(dx, dy)

  if (distance <= PDF_TAP_MAX_PX && sample.durationMs <= PDF_TAP_MAX_MS) {
    return 'tap'
  }

  if (sample.zoom > 1) return null
  if (Math.abs(dx) < PDF_SWIPE_MIN_PX) return null
  if (Math.abs(dx) < Math.abs(dy) * PDF_SWIPE_AXIS_RATIO) return null

  return dx < 0 ? 'swipe-next' : 'swipe-prev'
}
