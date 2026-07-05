import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useEffect, useRef, useState } from 'react'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const PDF_VIEWER_VERTICAL_CHROME = 160
const MIN_PAGE_HEIGHT = 320

type ViewerSize = {
  width: number
  height: number
}

function usePdfDocument(url: string) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    setPageNum(1)
    const task = pdfjsLib.getDocument({ url })
    task.promise
      .then((doc) => {
        setPdf(doc)
        setNumPages(doc.numPages)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        setError(true)
      })
    return () => {
      task.destroy()
    }
  }, [url])

  return { pdf, pageNum, setPageNum, numPages, loading, error }
}

function useViewerSize(containerRef: RefObject<HTMLDivElement | null>) {
  const [viewerSize, setViewerSize] = useState<ViewerSize>({
    width: 800,
    height: 800,
  })

  useEffect(() => {
    const updateViewerSize = () => {
      const width = containerRef.current?.clientWidth ?? 800
      const height = Math.max(
        MIN_PAGE_HEIGHT,
        window.innerHeight - PDF_VIEWER_VERTICAL_CHROME,
      )

      setViewerSize((current) => {
        if (current.width === width && current.height === height) return current
        return { width, height }
      })
    }

    updateViewerSize()

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateViewerSize)
    if (containerRef.current) resizeObserver?.observe(containerRef.current)
    window.addEventListener('resize', updateViewerSize)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateViewerSize)
    }
  }, [containerRef])

  return viewerSize
}

function usePdfPageRender({
  pdf,
  pageNum,
  viewerSize,
  canvasRef,
}: {
  pdf: PDFDocumentProxy | null
  pageNum: number
  viewerSize: ViewerSize
  canvasRef: RefObject<HTMLCanvasElement | null>
}) {
  useEffect(() => {
    if (!pdf || !canvasRef.current) return
    const canvas = canvasRef.current
    let renderTask: RenderTask | null = null
    let cancelled = false

    pdf
      .getPage(pageNum)
      .then((page) => {
        if (cancelled) return
        const baseViewport = page.getViewport({ scale: 1 })
        const widthScale = viewerSize.width / baseViewport.width
        const heightScale = viewerSize.height / baseViewport.height
        const scale = Math.max(0.1, Math.min(widthScale, heightScale))
        const viewport = page.getViewport({ scale })

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.height = viewport.height
        canvas.width = viewport.width
        canvas.style.height = `${viewport.height}px`
        canvas.style.width = `${viewport.width}px`

        renderTask = page.render({ canvas, canvasContext: ctx, viewport })
        renderTask.promise.catch(() => {})
      })
      .catch(() => {})

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdf, pageNum, viewerSize, canvasRef])
}

function PdfPaginationControls({
  pageNum,
  numPages,
  setPageNum,
}: {
  pageNum: number
  numPages: number
  setPageNum: Dispatch<SetStateAction<number>>
}) {
  return (
    <div className="flex items-center gap-4 pb-2">
      <Button
        variant="ghost"
        theme="dark"
        size="sm"
        onClick={() => setPageNum((p) => Math.max(1, p - 1))}
        disabled={pageNum <= 1}
      >
        Previous
      </Button>
      <span className="text-xs text-[#8E816D]">
        {pageNum} / {numPages}
      </span>
      <Button
        variant="ghost"
        theme="dark"
        size="sm"
        onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
        disabled={pageNum >= numPages}
      >
        Next
      </Button>
    </div>
  )
}

export function PdfViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { pdf, pageNum, setPageNum, numPages, loading, error } =
    usePdfDocument(url)
  const viewerSize = useViewerSize(containerRef)
  usePdfPageRender({ pdf, pageNum, viewerSize, canvasRef })

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-[#8E816D]">
        Unable to load document.
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center gap-4">
      {loading && <div className="py-12 text-sm text-[#8E816D]">Loading…</div>}
      <canvas ref={canvasRef} className="max-w-full" />
      {numPages > 1 && (
        <PdfPaginationControls
          pageNum={pageNum}
          numPages={numPages}
          setPageNum={setPageNum}
        />
      )}
    </div>
  )
}
