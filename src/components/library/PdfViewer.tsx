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
import type {
  Dispatch,
  Ref,
  RefCallback,
  RefObject,
  SetStateAction,
} from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import type { PdfGesture } from '@/components/library/pdf-viewer.gesture.domain'
import type { ViewerSize } from '@/components/library/use-pdf-viewer-size'
import { usePdfDocument } from '@/components/library/use-pdf-document'
import { usePdfFullscreen } from '@/components/library/use-pdf-fullscreen'
import { useViewerSize } from '@/components/library/use-pdf-viewer-size'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  resolvePdfPageInput,
  resolvePdfResumePage,
} from '@/components/library/pdf-viewer.domain'
import { usePdfZoom } from '@/components/library/use-pdf-zoom'
import { cn } from '@/lib/utils'

const ZOOM_RENDER_DELAY_MS = 120
// The ghost variant's hover/aria-expanded tokens use light-theme muted/foreground
// (near-white bg, near-black icon) — illegible on the dark reader surface.
const READER_BAR_BUTTON_CLASSES =
  'hover:bg-white/10 hover:text-white aria-expanded:bg-white/10 aria-expanded:text-[#D6B16E]'

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

function PdfErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center text-sm text-[#8E816D]">
      Unable to load document.
      <Button
        variant="ghost"
        theme="dark"
        size="sm"
        className={READER_BAR_BUTTON_CLASSES}
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  )
}

function PdfCanvasViewport({
  canvasRef,
  viewportRef,
  pageSize,
  zoom,
  isFullscreen,
  onScroll,
  pointerHandlers,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>
  viewportRef: RefCallback<HTMLDivElement>
  pageSize: ViewerSize
  zoom: number
  isFullscreen: boolean
  onScroll: ReturnType<typeof usePdfZoom>['onScroll']
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
      onScroll={onScroll}
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
  containerRef: Ref<HTMLDivElement>
  canvasRef: RefObject<HTMLCanvasElement | null>
  viewportRef: RefCallback<HTMLDivElement>
  pageSize: ViewerSize
  zoom: ReturnType<typeof usePdfZoom>
  pageNum: number
  numPages: number
  setPageNum: Dispatch<SetStateAction<number>>
  isLoading: boolean
  isError: boolean
  onRetry: () => void
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
      {props.isError ? (
        <PdfErrorState onRetry={props.onRetry} />
      ) : (
        <PdfCanvasViewport
          canvasRef={props.canvasRef}
          viewportRef={props.viewportRef}
          onScroll={props.zoom.onScroll}
          pageSize={props.pageSize}
          zoom={props.zoom.zoom}
          isFullscreen={props.isFullscreen}
          pointerHandlers={props.zoom.pointerHandlers}
        />
      )}
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
  docKey,
  pdf,
  numPages,
  pageNum,
  initialPage,
  setPageNum,
  onPageChange,
}: {
  docKey: string
  pdf: PDFDocumentProxy | null
  numPages: number
  pageNum: number
  initialPage: number | null
  setPageNum: Dispatch<SetStateAction<number>>
  onPageChange?: (page: number) => void
}) {
  const [resumeApplied, setResumeApplied] = useState(false)

  useEffect(() => setResumeApplied(false), [docKey])
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
  docKey,
  pdf,
  pageNum,
  viewerSize,
  isFullscreen,
  canvasRef,
  viewportRef,
  setPageSize,
  onGesture,
}: {
  docKey: string
  pdf: PDFDocumentProxy | null
  pageNum: number
  viewerSize: ViewerSize
  isFullscreen: boolean
  canvasRef: RefObject<HTMLCanvasElement | null>
  viewportRef: RefObject<HTMLDivElement | null>
  setPageSize: Dispatch<SetStateAction<ViewerSize>>
  onGesture: (gesture: PdfGesture) => void
}) {
  const zoomResetKey = `${docKey}:${isFullscreen}`
  const pageScrollKey = `${docKey}:${pageNum}`
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
  // Callback-ref state (not a RefObject) so the size and fullscreen observers
  // attach to the live surface node and re-run if it is ever remounted.
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [pageSize, setPageSize] = useState<ViewerSize>({ width: 0, height: 0 })
  const { pdf, pageNum, setPageNum, numPages, loading, error, retry, docKey } =
    usePdfDocument(url)
  const { isFullscreen, isFallbackFullscreen, toggle } =
    usePdfFullscreen(containerEl)
  const viewerSize = useViewerSize(containerEl, isFullscreen)
  const chrome = usePdfReaderChrome(isFullscreen, numPages, setPageNum)
  const zoom = usePdfPagePipeline({
    docKey,
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
    docKey,
    pdf,
    numPages,
    pageNum,
    initialPage,
    setPageNum,
    onPageChange,
  })

  // The surface stays mounted through load errors so fullscreen — native and
  // fallback — plus page, zoom, scroll, and position survive the retry.
  return (
    <PdfViewerSurface
      containerRef={setContainerEl}
      canvasRef={canvasRef}
      viewportRef={zoom.attachViewport}
      pageSize={pageSize}
      zoom={zoom}
      pageNum={pageNum}
      numPages={numPages}
      setPageNum={setPageNum}
      isLoading={loading}
      isError={error}
      onRetry={retry}
      isFullscreen={isFullscreen}
      isFallbackFullscreen={isFallbackFullscreen}
      onToggleFullscreen={toggle}
      chrome={chrome}
    />
  )
}
