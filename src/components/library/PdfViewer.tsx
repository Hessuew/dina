import { useEffect, useRef, useState } from 'react'
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from 'lucide-react'
// Legacy build polyfills Promise.withResolvers for older browsers (DINA-Z).
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { resolvePdfPageInput } from '@/components/library/pdf-viewer.domain'
import { toggleNativePdfFullscreen } from '@/components/library/pdf-viewer.fullscreen'
import { usePdfZoom } from '@/components/library/use-pdf-zoom'
import { cn } from '@/lib/utils'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const PDF_VIEWER_VERTICAL_CHROME = 160
const MIN_PAGE_HEIGHT = 320
const ZOOM_RENDER_DELAY_MS = 120

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
    setPdf(null)

    let task: ReturnType<typeof pdfjsLib.getDocument> | null = null
    try {
      task = pdfjsLib.getDocument({ url })
    } catch {
      setLoading(false)
      setError(true)
      return
    }

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

function useViewerSize(
  containerRef: RefObject<HTMLDivElement | null>,
  isFullscreen: boolean,
) {
  const [viewerSize, setViewerSize] = useState<ViewerSize>({
    width: 800,
    height: 800,
  })

  useEffect(() => {
    const updateViewerSize = () => {
      const width = containerRef.current?.clientWidth ?? 800
      const height = Math.max(
        MIN_PAGE_HEIGHT,
        window.innerHeight - (isFullscreen ? 96 : PDF_VIEWER_VERTICAL_CHROME),
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
  }, [containerRef, isFullscreen])

  return viewerSize
}

function useNativeFullscreen(containerRef: RefObject<HTMLDivElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    const update = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
      setIsSupported(
        Boolean(
          containerRef.current?.requestFullscreen && document.exitFullscreen,
        ),
      )
    }
    update()
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [containerRef])

  const toggle = async (): Promise<'handled' | 'fallback'> => {
    const container = containerRef.current
    if (!container) return 'handled'
    return toggleNativePdfFullscreen(document, container)
  }

  return { isFullscreen, isSupported, toggle }
}

function useFallbackFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!isFullscreen) return
    const previousOverflow = document.body.style.overflow
    const exitOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false)
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', exitOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', exitOnEscape)
    }
  }, [isFullscreen])

  return {
    isFullscreen,
    enter: () => setIsFullscreen(true),
    toggle: () => setIsFullscreen((current) => !current),
  }
}

function usePdfFullscreen(containerRef: RefObject<HTMLDivElement | null>) {
  const native = useNativeFullscreen(containerRef)
  const fallback = useFallbackFullscreen()
  const toggle = () => {
    if (fallback.isFullscreen) {
      fallback.toggle()
      return
    }
    if (native.isSupported) {
      void native.toggle().then((result) => {
        if (result === 'fallback') fallback.enter()
      })
      return
    }
    fallback.toggle()
  }
  return {
    isFullscreen: native.isFullscreen || fallback.isFullscreen,
    isFallbackFullscreen: fallback.isFullscreen,
    toggle,
  }
}

function usePdfPageRender({
  pdf,
  pageNum,
  viewerSize,
  canvasRef,
  setPageSize,
  renderZoom,
}: {
  pdf: PDFDocumentProxy | null
  pageNum: number
  viewerSize: ViewerSize
  canvasRef: RefObject<HTMLCanvasElement | null>
  setPageSize: Dispatch<SetStateAction<ViewerSize>>
  renderZoom: number
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
        const pageViewport = page.getViewport({ scale })
        const renderViewport = page.getViewport({ scale: scale * renderZoom })

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.height = renderViewport.height
        canvas.width = renderViewport.width
        setPageSize({ width: pageViewport.width, height: pageViewport.height })

        renderTask = page.render({
          canvas,
          canvasContext: ctx,
          viewport: renderViewport,
        })
        renderTask.promise.catch(() => {})
      })
      .catch(() => {})

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdf, pageNum, viewerSize, canvasRef, setPageSize, renderZoom])
}

function useRenderedZoom(zoom: number, resetKey: string) {
  const [renderedZoom, setRenderedZoom] = useState(1)
  useEffect(() => {
    const timeout = window.setTimeout(
      () => setRenderedZoom(zoom),
      ZOOM_RENDER_DELAY_MS,
    )
    return () => window.clearTimeout(timeout)
  }, [zoom])
  useEffect(() => setRenderedZoom(1), [resetKey])
  return renderedZoom
}

function PageNumberInput({
  pageNum,
  numPages,
  setPageNum,
}: {
  pageNum: number
  numPages: number
  setPageNum: Dispatch<SetStateAction<number>>
}) {
  const [value, setValue] = useState(String(pageNum))

  useEffect(() => setValue(String(pageNum)), [pageNum])

  const commit = () => {
    const page = resolvePdfPageInput(value, numPages, pageNum)
    setPageNum(page)
    setValue(String(page))
  }

  return (
    <form
      className="flex items-center gap-2 text-xs text-[#8E816D]"
      onSubmit={(event) => {
        event.preventDefault()
        commit()
      }}
    >
      <span>Page</span>
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        max={numPages}
        value={value}
        aria-label={`Page number, 1 to ${numPages}`}
        className="h-8 w-16 border-white/10 bg-[#1A1716] px-2 text-center text-xs text-[#F8F4EC] focus-visible:border-[#C5A059]/40 focus-visible:ring-0"
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
      />
      <span>/ {numPages}</span>
    </form>
  )
}

function FullscreenButton({
  isFullscreen,
  onToggle,
}: {
  isFullscreen: boolean
  onToggle: () => void
}) {
  const label = isFullscreen ? 'Exit full screen' : 'Full screen'
  const Icon = isFullscreen ? Minimize2 : Maximize2
  return (
    <Button
      variant="ghost"
      theme="dark"
      size="sm"
      aria-label={label}
      onClick={onToggle}
    >
      <Icon className="size-4" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}

function PdfZoomControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}) {
  return (
    <div className="flex items-center gap-1" aria-label="PDF zoom controls">
      <Button
        variant="ghost"
        theme="dark"
        size="sm"
        aria-label="Zoom out"
        onClick={onZoomOut}
      >
        <ZoomOutIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        theme="dark"
        size="sm"
        aria-label="Reset zoom"
        onClick={onReset}
      >
        <RotateCcw className="size-3.5" />
        <span className="text-xs">{Math.round(zoom * 100)}%</span>
      </Button>
      <Button
        variant="ghost"
        theme="dark"
        size="sm"
        aria-label="Zoom in"
        onClick={onZoomIn}
      >
        <ZoomInIcon className="size-4" />
      </Button>
    </div>
  )
}

function FullscreenZoomControls({
  isFullscreen,
  ...props
}: React.ComponentProps<typeof PdfZoomControls> & { isFullscreen: boolean }) {
  if (!isFullscreen) return null
  return <PdfZoomControls {...props} />
}

function PdfViewerControls({
  pageNum,
  numPages,
  setPageNum,
  isFullscreen,
  onToggleFullscreen,
  zoomControls,
}: {
  pageNum: number
  numPages: number
  setPageNum: Dispatch<SetStateAction<number>>
  isFullscreen: boolean
  onToggleFullscreen: () => void
  zoomControls: Omit<
    React.ComponentProps<typeof PdfZoomControls>,
    'isFullscreen'
  >
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2 pb-2 sm:gap-4">
      <Button
        variant="ghost"
        theme="dark"
        size="sm"
        onClick={() => setPageNum((p) => Math.max(1, p - 1))}
        disabled={pageNum <= 1}
      >
        Previous
      </Button>
      <PageNumberInput
        pageNum={pageNum}
        numPages={numPages}
        setPageNum={setPageNum}
      />
      <Button
        variant="ghost"
        theme="dark"
        size="sm"
        onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
        disabled={pageNum >= numPages}
      >
        Next
      </Button>
      <FullscreenButton
        isFullscreen={isFullscreen}
        onToggle={onToggleFullscreen}
      />
      <FullscreenZoomControls isFullscreen={isFullscreen} {...zoomControls} />
    </div>
  )
}

function PdfLoadingState({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null
  return <div className="py-12 text-sm text-[#8E816D]">Loading…</div>
}

function PdfCanvasViewport({
  canvasRef,
  viewportRef,
  pageSize,
  zoom,
  isFullscreen,
  pointerHandlers,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  viewportRef: RefObject<HTMLDivElement | null>
  pageSize: ViewerSize
  zoom: number
  isFullscreen: boolean
  pointerHandlers: ReturnType<typeof usePdfZoom>['pointerHandlers']
}) {
  return (
    <div
      ref={viewportRef}
      className={cn('w-full overflow-auto overscroll-contain', {
        'min-h-0 flex-1': isFullscreen,
      })}
      style={{ touchAction: 'pan-x pan-y' }}
      {...pointerHandlers}
    >
      <div className="flex min-h-full w-max min-w-full items-center justify-center">
        <canvas
          ref={canvasRef}
          className="max-w-none"
          style={{
            width: pageSize.width * zoom,
            height: pageSize.height * zoom,
          }}
        />
      </div>
    </div>
  )
}

type PdfViewerSurfaceProps = {
  containerRef: RefObject<HTMLDivElement | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  viewportRef: RefObject<HTMLDivElement | null>
  pageSize: ViewerSize
  zoom: ReturnType<typeof usePdfZoom>
  pageNum: number
  numPages: number
  setPageNum: Dispatch<SetStateAction<number>>
  isLoading: boolean
  isFullscreen: boolean
  isFallbackFullscreen: boolean
  onToggleFullscreen: () => void
}

function PdfViewerSurface(props: PdfViewerSurfaceProps) {
  return (
    <div
      ref={props.containerRef}
      className={cn(
        'fullscreen:h-screen fullscreen:justify-center fullscreen:p-4 flex w-full flex-col items-center gap-4 bg-[#151515]',
        {
          'fixed inset-0 z-50 h-dvh w-screen justify-center p-4':
            props.isFallbackFullscreen,
        },
      )}
    >
      <PdfLoadingState isLoading={props.isLoading} />
      <PdfCanvasViewport
        canvasRef={props.canvasRef}
        viewportRef={props.viewportRef}
        pageSize={props.pageSize}
        zoom={props.zoom.zoom}
        isFullscreen={props.isFullscreen}
        pointerHandlers={props.zoom.pointerHandlers}
      />
      {props.numPages > 0 && (
        <PdfViewerControls
          pageNum={props.pageNum}
          numPages={props.numPages}
          setPageNum={props.setPageNum}
          isFullscreen={props.isFullscreen}
          onToggleFullscreen={props.onToggleFullscreen}
          zoomControls={{
            zoom: props.zoom.zoom,
            onZoomIn: props.zoom.zoomIn,
            onZoomOut: props.zoom.zoomOut,
            onReset: props.zoom.resetZoom,
          }}
        />
      )}
    </div>
  )
}

export function PdfViewer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pageSize, setPageSize] = useState<ViewerSize>({ width: 0, height: 0 })
  const { pdf, pageNum, setPageNum, numPages, loading, error } =
    usePdfDocument(url)
  const { isFullscreen, isFallbackFullscreen, toggle } =
    usePdfFullscreen(containerRef)
  const viewerSize = useViewerSize(containerRef, isFullscreen)
  const zoomResetKey = `${url}:${isFullscreen}`
  const pageScrollKey = `${url}:${pageNum}`
  const zoom = usePdfZoom(viewportRef, zoomResetKey, pageScrollKey)
  const renderedZoom = useRenderedZoom(zoom.zoom, zoomResetKey)
  usePdfPageRender({
    pdf,
    pageNum,
    viewerSize,
    canvasRef,
    setPageSize,
    renderZoom: renderedZoom,
  })

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-[#8E816D]">
        Unable to load document.
      </div>
    )
  }

  return (
    <PdfViewerSurface
      containerRef={containerRef}
      canvasRef={canvasRef}
      viewportRef={viewportRef}
      pageSize={pageSize}
      zoom={zoom}
      pageNum={pageNum}
      numPages={numPages}
      setPageNum={setPageNum}
      isLoading={loading}
      isFullscreen={isFullscreen}
      isFallbackFullscreen={isFallbackFullscreen}
      onToggleFullscreen={toggle}
    />
  )
}
