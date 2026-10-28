import {
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  VideoIcon,
} from 'lucide-react'
import { Suspense, lazy, useCallback, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { YouTubeEmbed } from '../youtube-embed/YouTubeEmbed'
import type { ReactNode } from 'react'
import type { MediaLibraryRow } from '@/utils/library/library'
import type {
  MediaContentKind,
  MediaContentViewModel,
  MediaDownloadIo,
} from '@/components/library/media-detail-viewer/media-content.domain'
import {
  buildMediaContentViewModel,
  downloadFileOrOpenTab,
  resolveViewerUrl,
} from '@/components/library/media-detail-viewer/media-content.domain'
import {
  buildMediaDownloadFilename,
  shouldShowMediaDownload,
} from '@/utils/library/domain/library.domain'
import { cn } from '@/lib/utils'

const PdfViewer = lazy(() =>
  import('@/components/library/PdfViewer').then((m) => ({
    default: m.PdfViewer,
  })),
)

const DARK_SURFACE_ACTION_CLASSES =
  'group inline-flex items-center gap-2 border border-[#C5A059]/35 bg-[#1A1716] text-[0.68rem] font-medium tracking-[0.2em] text-[#E9D9B4] uppercase transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white'

function clickDownloadAnchor(href: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function browserDownloadIo(): MediaDownloadIo {
  return {
    fetch,
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    clickAnchor: clickDownloadAnchor,
    openBlankTab: () => {
      const popup = window.open('about:blank', '_blank')
      if (!popup) return null
      popup.opener = null
      return {
        navigate: (url) => {
          popup.location.href = url
        },
        close: () => popup.close(),
      }
    },
    schedule: (callback, delayMs) => {
      window.setTimeout(callback, delayMs)
    },
  }
}

function useMediaDownload(href: string, filename: string) {
  const [isDownloading, setIsDownloading] = useState(false)

  const onDownload = useCallback(
    async (event: { preventDefault: () => void }) => {
      event.preventDefault()
      if (isDownloading) return
      setIsDownloading(true)
      try {
        await downloadFileOrOpenTab(href, filename, browserDownloadIo())
      } finally {
        setIsDownloading(false)
      }
    },
    [filename, href, isDownloading],
  )

  return { isDownloading, onDownload }
}

type MediaDetailViewerProps = {
  media: Pick<
    MediaLibraryRow,
    'title' | 'description' | 'fileType' | 'fileUrl' | 'allowsDownload'
  >
  viewerUrl: string | null
  initialPage?: number | null
  onPageChange?: (page: number) => void
}

function MediaDescription({ description }: { description: string | null }) {
  if (!description) return null

  return (
    <div className="mb-8 border border-[#1A1A1A]/10 bg-white/60 p-6 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.08)]">
      <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#9B7A41] uppercase">
        Description
      </div>
      <p className="mt-3 text-sm leading-7 text-[#4E463D]">{description}</p>
    </div>
  )
}

function MediaDownloadLink({
  href,
  filename,
}: {
  href: string
  filename: string
}) {
  const { isDownloading, onDownload } = useMediaDownload(href, filename)

  return (
    <a
      href={href}
      download={filename}
      rel="noopener noreferrer"
      aria-busy={isDownloading}
      onClick={onDownload}
      className={cn(DARK_SURFACE_ACTION_CLASSES, 'px-3 py-1.5')}
    >
      {isDownloading ? 'Downloading' : 'Download'}
      <DownloadIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
    </a>
  )
}

function MediaViewerHeader({
  isVideo,
  downloadHref,
  downloadFilename,
}: {
  isVideo: boolean
  downloadHref: string | null
  downloadFilename: string
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
      <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
        {isVideo ? 'Video' : 'Document'}
      </div>
      <div className="flex items-center gap-3 text-[#8E816D]">
        {downloadHref && (
          <MediaDownloadLink href={downloadHref} filename={downloadFilename} />
        )}
        {isVideo ? (
          <VideoIcon className="size-4" />
        ) : (
          <FileTextIcon className="size-4" />
        )}
      </div>
    </div>
  )
}

function UnembeddableVideo({ fileUrl }: { fileUrl: string }) {
  return (
    <div className="flex flex-col items-center gap-5 px-6 py-14 text-center">
      <p className="text-sm text-[#8E816D]">
        This video URL could not be parsed for embedding.
      </p>
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(DARK_SURFACE_ACTION_CLASSES, 'px-5 py-2.5')}
      >
        Open original link
        <ExternalLinkIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
      </a>
    </div>
  )
}

function ViewerUnavailable({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-8 text-center text-sm text-[#8E816D]">
      {message}
      <button
        type="button"
        onClick={onRetry}
        className={cn(DARK_SURFACE_ACTION_CLASSES, 'px-5 py-2.5')}
      >
        Try again
      </button>
    </div>
  )
}

function UploadedVideoContent({
  viewerUrl,
  onRetry,
}: {
  viewerUrl: string | null
  onRetry: () => void
}) {
  // The failure pins to the URL that produced it, so a freshly issued URL
  // recovers in the same render — no intermediate stale error frame.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  const usableUrl = resolveViewerUrl(viewerUrl, failedUrl)
  if (!usableUrl) {
    return <ViewerUnavailable message="Video unavailable." onRetry={onRetry} />
  }

  return (
    <div className="bg-black">
      <video
        controls
        playsInline
        preload="metadata"
        src={usableUrl}
        onError={() => setFailedUrl(usableUrl)}
        className="aspect-video w-full"
      >
        Your browser does not support video playback.
      </video>
    </div>
  )
}

function PdfContent({
  viewerUrl,
  initialPage,
  onPageChange,
  onRetry,
}: {
  viewerUrl: string | null
  initialPage?: number | null
  onPageChange?: (page: number) => void
  onRetry: () => void
}) {
  const usableUrl = resolveViewerUrl(viewerUrl, null)
  if (!usableUrl) {
    return (
      <ViewerUnavailable message="Document unavailable." onRetry={onRetry} />
    )
  }

  return (
    <div className="p-4">
      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-[#8E816D]">
            Loading…
          </div>
        }
      >
        <PdfViewer
          url={usableUrl}
          initialPage={initialPage}
          onPageChange={onPageChange}
        />
      </Suspense>
    </div>
  )
}

function OfficeContent({
  viewerUrl,
  onRetry,
}: {
  viewerUrl: string | null
  onRetry: () => void
}) {
  const usableUrl = resolveViewerUrl(viewerUrl, null)
  if (!usableUrl) {
    return (
      <ViewerUnavailable message="Document unavailable." onRetry={onRetry} />
    )
  }

  // Cross-origin iframe failures can't be detected, so the recovery action
  // stays visible: retrying re-issues the signed URL, and keying the iframe
  // on it remounts the embed against the fresh URL.
  return (
    <div>
      <div className="aspect-4/3 w-full">
        <iframe
          key={usableUrl}
          src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(usableUrl)}`}
          title="Document preview"
          className="size-full border-0"
        />
      </div>
      <div className="flex justify-center px-6 py-4">
        <button
          type="button"
          onClick={onRetry}
          className={cn(DARK_SURFACE_ACTION_CLASSES, 'px-5 py-2.5')}
        >
          Document not loading? Try again
        </button>
      </div>
    </div>
  )
}

function MediaContent({
  viewModel,
  media,
  viewerUrl,
  initialPage,
  onPageChange,
  onRetry,
}: {
  viewModel: MediaContentViewModel
  media: MediaDetailViewerProps['media']
  viewerUrl: string | null
  initialPage?: number | null
  onPageChange?: (page: number) => void
  onRetry: () => void
}) {
  const { kind, videoId } = viewModel

  const bodyByKind: Record<MediaContentKind, ReactNode> = {
    youtube: (
      <YouTubeEmbed videoId={videoId ?? ''} originalUrl={media.fileUrl} />
    ),
    'unembeddable-video': <UnembeddableVideo fileUrl={media.fileUrl} />,
    'uploaded-video': (
      <UploadedVideoContent viewerUrl={viewerUrl} onRetry={onRetry} />
    ),
    pdf: (
      <PdfContent
        viewerUrl={viewerUrl}
        initialPage={initialPage}
        onPageChange={onPageChange}
        onRetry={onRetry}
      />
    ),
    office: <OfficeContent viewerUrl={viewerUrl} onRetry={onRetry} />,
    none: (
      <p className="px-6 py-8 text-sm text-[#8E816D]">
        This file type cannot be previewed.
      </p>
    ),
  }

  return <div className="overflow-hidden">{bodyByKind[kind]}</div>
}

export function MediaDetailViewer({
  media,
  viewerUrl,
  initialPage,
  onPageChange,
}: MediaDetailViewerProps) {
  const router = useRouter()
  // Retry re-runs the route loader, which issues a fresh signed viewer URL
  // (1h TTL, ADR 0002) — recovering both missing and expired URLs.
  const refreshViewerUrl = useCallback(() => {
    void router.invalidate()
  }, [router])
  const viewModel = buildMediaContentViewModel(media)
  const isVideo =
    viewModel.kind === 'youtube' ||
    viewModel.kind === 'unembeddable-video' ||
    viewModel.kind === 'uploaded-video'
  const downloadHref = shouldShowMediaDownload({
    fileType: media.fileType,
    allowsDownload: media.allowsDownload,
    viewerUrl,
  })
    ? viewerUrl
    : null

  return (
    <>
      <MediaDescription description={media.description} />
      <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
        <MediaViewerHeader
          isVideo={isVideo}
          downloadHref={downloadHref}
          downloadFilename={buildMediaDownloadFilename(
            media.title,
            media.fileUrl,
          )}
        />
        <MediaContent
          viewModel={viewModel}
          media={media}
          viewerUrl={viewerUrl}
          initialPage={initialPage}
          onPageChange={onPageChange}
          onRetry={refreshViewerUrl}
        />
      </div>
    </>
  )
}
