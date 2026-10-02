export function resolvePdfPageInput(
  value: string,
  numPages: number,
  currentPage: number,
): number {
  if (!value.trim()) return currentPage
  const page = Number(value)
  if (!Number.isInteger(page)) return currentPage
  return Math.min(numPages, Math.max(1, page))
}

const MIN_PDF_ZOOM = 1
const MAX_PDF_ZOOM = 4

export function clampPdfZoom(zoom: number): number {
  return Math.min(MAX_PDF_ZOOM, Math.max(MIN_PDF_ZOOM, zoom))
}

export function resolvePdfPinchZoom(
  startZoom: number,
  startDistance: number,
  currentDistance: number,
): number {
  if (startDistance <= 0 || currentDistance <= 0) return startZoom
  return clampPdfZoom((startZoom * currentDistance) / startDistance)
}

export function resolvePdfResumePage(options: {
  initialPage: number | null
  numPages: number
  docReady: boolean
  alreadyApplied: boolean
}): number | null {
  if (options.alreadyApplied || !options.docReady) return null
  if (options.initialPage == null || options.numPages === 0) return null
  return Math.min(options.numPages, Math.max(1, options.initialPage))
}
