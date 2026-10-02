import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from 'lucide-react'
// Legacy build polyfills Promise.withResolvers for older browsers (DINA-Z).
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import type { PdfGesture } from '@/components/library/pdf-viewer.gesture.domain'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  resolvePdfPageInput,
  resolvePdfResumePage,
} from '@/components/library/pdf-viewer.domain'
import { toggleNativePdfFullscreen } from '@/components/library/pdf-viewer.fullscreen'
import { usePdfZoom } from '@/components/library/use-pdf-zoom'
import { cn } from '@/lib/utils'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const PDF_VIEWER_VERTICAL_CHROME = 120
const PDF_VIEWER_FULLSCREEN_CHROME = 72
const MIN_PAGE_HEIGHT = 320
const ZOOM_RENDER_DELAY_MS = 120
// The ghost variant's hover/aria-expanded tokens use light-theme muted/foreground
// (near-white bg, near-black icon) — illegible on the dark reader surface.
const READER_BAR_BUTTON_CLASSES =
  'hover:bg-white/10 hover:text-white aria-expanded:bg-white/10 aria-expanded:text-[#D6B16E]'

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
        window.innerHeight -
          (isFullscreen
            ? PDF_VIEWER_FULLSCREEN_CHROME
            : PDF_VIEWER_VERTICAL_CHROME),
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
  autoFocus = false,
}: {
  pageNum: number
  numPages: number
  setPageNum: Dispatch<SetStateAction<number>>
  autoFocus?: boolean
}) {
  const [value, setValue] = useState(String(pageNum))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setValue(String(pageNum)), [pageNum])
  // autoFocus alone only applies on mount; the tray may already be open when
  // the page indicator is tapped, so focus imperatively on the signal flip.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

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
        ref={inputRef}
        type="number"
        inputMode="numeric"
        min={1}
        max={numPages}
        autoFocus={autoFocus}
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
      className={READER_BAR_BUTTON_CLASSES}
      onClick={onToggle}
    >
      <Icon className="size-4" />
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
        className={READER_BAR_BUTTON_CLASSES}
        onClick={onZoomOut}
      >
        <ZoomOutIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        theme="dark"
        size="sm"
        aria-label="Reset zoom"
        className={READER_BAR_BUTTON_CLASSES}
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
        className={READER_BAR_BUTTON_CLASSES}
        onClick={onZoomIn}
      >
        <ZoomInIcon className="size-4" />
      </Button>
    </div>
  )
}

type PdfReaderTrayState = {
  expanded: boolean
  focusJump: boolean
}

function PdfPageJumpButton({
  pageNum,
  numPages,
  onOpenJump,
}: {
  pageNum: number
  numPages: number
  onOpenJump: () => void
}) {
  return (
    <Button
      variant="ghost"
      theme="dark"
      size="sm"
      aria-label={`Page ${pageNum} of ${numPages} — open page jump`}
      className={READER_BAR_BUTTON_CLASSES}
      onClick={onOpenJump}
    >
      <span className="text-xs tabular-nums">
        {pageNum} / {numPages}
      </span>
    </Button>
  )
}

function BarIconButton({
  label,
  onClick,
  disabled,
  expanded,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  expanded?: boolean
  children: React.ReactNode
}) {
  return (
    <Button
      variant="ghost"
      theme="dark"
      size="sm"
      aria-label={label}
      aria-expanded={expanded}
      className={READER_BAR_BUTTON_CLASSES}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}

function PdfReaderBar({
  pageNum,
  numPages,
  setPageNum,
  isFullscreen,
  onToggleFullscreen,
  tray,
  onToggleTray,
  onOpenJump,
}: {
  pageNum: number
  numPages: number
  setPageNum: Dispatch<SetStateAction<number>>
  isFullscreen: boolean
  onToggleFullscreen: () => void
  tray: PdfReaderTrayState
  onToggleTray: () => void
  onOpenJump: () => void
}) {
  return (
    <div className="flex w-full items-center justify-center gap-1 pb-2">
      <BarIconButton
        label="Previous page"
        onClick={() => setPageNum((p) => Math.max(1, p - 1))}
        disabled={pageNum <= 1}
      >
        <ChevronLeft className="size-4" />
      </BarIconButton>
      <PdfPageJumpButton
        pageNum={pageNum}
        numPages={numPages}
        onOpenJump={onOpenJump}
      />
      <BarIconButton
        label="Next page"
        onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
        disabled={pageNum >= numPages}
      >
        <ChevronRight className="size-4" />
      </BarIconButton>
      <FullscreenButton
        isFullscreen={isFullscreen}
        onToggle={onToggleFullscreen}
      />
      <BarIconButton
        label={tray.expanded ? 'Close reading options' : 'More reading options'}
        expanded={tray.expanded}
        onClick={onToggleTray}
      >
        {tray.expanded ? (
          <X className="size-4" />
        ) : (
          <Ellipsis className="size-4" />
        )}
      </BarIconButton>
    </div>
  )
}

function PdfReaderTray({
  tray,
  pageNum,
  numPages,
  setPageNum,
  zoomControls,
}: {
  tray: PdfReaderTrayState
  pageNum: number
  numPages: number
  setPageNum: Dispatch<SetStateAction<number>>
  zoomControls: React.ComponentProps<typeof PdfZoomControls>
}) {
  if (!tray.expanded) return null
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-3 border-t border-white/10 py-2">
      <PageNumberInput
        pageNum={pageNum}
        numPages={numPages}
        setPageNum={setPageNum}
        autoFocus={tray.focusJump}
      />
      <PdfZoomControls {...zoomControls} />
    </div>
  )
}

function PdfViewerControls({
  visible,
  pageNum,
  numPages,
  setPageNum,
  isFullscreen,
  onToggleFullscreen,
  tray,
  onToggleTray,
  onOpenJump,
  zoomControls,
}: {
  visible: boolean
  pageNum: number
  numPages: number
  setPageNum: Dispatch<SetStateAction<number>>
  isFullscreen: boolean
  onToggleFullscreen: () => void
  tray: PdfReaderTrayState
  onToggleTray: () => void
  onOpenJump: () => void
  zoomControls: React.ComponentProps<typeof PdfZoomControls>
}) {
  if (!visible) return null
  return (
    <div className="flex w-full flex-col items-center">
      <PdfReaderTray
        tray={tray}
        pageNum={pageNum}
        numPages={numPages}
        setPageNum={setPageNum}
        zoomControls={zoomControls}
      />
      <PdfReaderBar
        pageNum={pageNum}
        numPages={numPages}
        setPageNum={setPageNum}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        tray={tray}
        onToggleTray={onToggleTray}
        onOpenJump={onOpenJump}
      />
    </div>
  )
}

function PdfLoadingState({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null
  return <div className="py-12 text-sm text-[#8E816D]">Loading…</div>
}

function PdfErrorState() {
  return (
    <div className="py-12 text-center text-sm text-[#8E816D]">
      Unable to load document.
    </div>
  )
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
      // At zoom 1 the page fits, so horizontal pans are unused natively — giving
      // them to the browser would let scroll handling claim the gesture and fire
      // pointercancel, killing swipe page-turns. Zoomed, native pan owns them.
      style={{ touchAction: zoom > 1 ? 'pan-x pan-y' : 'pan-y' }}
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
  chrome: ReturnType<typeof usePdfReaderChrome>
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
          visible={props.chrome.chromeVisible}
          pageNum={props.pageNum}
          numPages={props.numPages}
          setPageNum={props.setPageNum}
          isFullscreen={props.isFullscreen}
          onToggleFullscreen={props.onToggleFullscreen}
          tray={props.chrome.tray}
          onToggleTray={props.chrome.toggleTray}
          onOpenJump={props.chrome.openJump}
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

function usePdfReaderChrome(
  isFullscreen: boolean,
  numPages: number,
  setPageNum: Dispatch<SetStateAction<number>>,
) {
  const [chromeVisible, setChromeVisible] = useState(true)
  const [tray, setTray] = useState<PdfReaderTrayState>({
    expanded: false,
    focusJump: false,
  })

  useEffect(() => {
    if (!isFullscreen) setChromeVisible(true)
  }, [isFullscreen])

  const toggleTray = () =>
    setTray((current) => ({ expanded: !current.expanded, focusJump: false }))
  const openJump = () => setTray({ expanded: true, focusJump: true })

  const handleGesture = useCallback(
    (gesture: PdfGesture) => {
      if (gesture === 'tap') {
        if (isFullscreen) setChromeVisible((visible) => !visible)
        return
      }
      if (numPages === 0) return
      setPageNum((p) =>
        gesture === 'swipe-next'
          ? Math.min(numPages, p + 1)
          : Math.max(1, p - 1),
      )
    },
    [isFullscreen, numPages, setPageNum],
  )

  return { chromeVisible, tray, toggleTray, openJump, handleGesture }
}

function usePdfResume({
  url,
  pdf,
  numPages,
  pageNum,
  initialPage,
  setPageNum,
  onPageChange,
}: {
  url: string
  pdf: PDFDocumentProxy | null
  numPages: number
  pageNum: number
  initialPage: number | null
  setPageNum: Dispatch<SetStateAction<number>>
  onPageChange?: (page: number) => void
}) {
  const [resumeApplied, setResumeApplied] = useState(false)

  useEffect(() => setResumeApplied(false), [url])
  useEffect(() => {
    const resumePage = resolvePdfResumePage({
      initialPage,
      numPages,
      docReady: pdf != null,
      alreadyApplied: resumeApplied,
    })
    if (resumePage == null) return
    setResumeApplied(true)
    setPageNum(resumePage)
  }, [pdf, numPages, resumeApplied, initialPage, setPageNum])
  useEffect(() => {
    if (pdf && resumeApplied) onPageChange?.(pageNum)
  }, [pdf, resumeApplied, pageNum, onPageChange])
}

function usePdfPagePipeline({
  url,
  pdf,
  pageNum,
  viewerSize,
  isFullscreen,
  canvasRef,
  viewportRef,
  setPageSize,
  onGesture,
}: {
  url: string
  pdf: PDFDocumentProxy | null
  pageNum: number
  viewerSize: ViewerSize
  isFullscreen: boolean
  canvasRef: RefObject<HTMLCanvasElement | null>
  viewportRef: RefObject<HTMLDivElement | null>
  setPageSize: Dispatch<SetStateAction<ViewerSize>>
  onGesture: (gesture: PdfGesture) => void
}) {
  const zoomResetKey = `${url}:${isFullscreen}`
  const pageScrollKey = `${url}:${pageNum}`
  const zoom = usePdfZoom(viewportRef, zoomResetKey, pageScrollKey, onGesture)
  const renderedZoom = useRenderedZoom(zoom.zoom, zoomResetKey)
  usePdfPageRender({
    pdf,
    pageNum,
    viewerSize,
    canvasRef,
    setPageSize,
    renderZoom: renderedZoom,
  })
  return zoom
}

export function PdfViewer({
  url,
  initialPage = 1,
  onPageChange,
}: {
  url: string
  initialPage?: number | null
  onPageChange?: (page: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pageSize, setPageSize] = useState<ViewerSize>({ width: 0, height: 0 })
  const { pdf, pageNum, setPageNum, numPages, loading, error } =
    usePdfDocument(url)
  const { isFullscreen, isFallbackFullscreen, toggle } =
    usePdfFullscreen(containerRef)
  const viewerSize = useViewerSize(containerRef, isFullscreen)
  const chrome = usePdfReaderChrome(isFullscreen, numPages, setPageNum)
  const zoom = usePdfPagePipeline({
    url,
    pdf,
    pageNum,
    viewerSize,
    isFullscreen,
    canvasRef,
    viewportRef,
    setPageSize,
    onGesture: chrome.handleGesture,
  })
  usePdfResume({
    url,
    pdf,
    numPages,
    pageNum,
    initialPage,
    setPageNum,
    onPageChange,
  })

  if (error) {
    return <PdfErrorState />
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
      chrome={chrome}
    />
  )
}
