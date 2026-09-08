import {
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  VideoIcon,
} from 'lucide-react'
import { Suspense, lazy, useCallback, useState } from 'react'
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
} from '@/components/library/media-detail-viewer/media-content.domain'
import {
  buildMediaDownloadFilename,
  shouldShowMediaDownload,
} from '@/utils/library/domain/library.domain'

const PdfViewer = lazy(() =>
  import('@/components/library/PdfViewer').then((m) => ({
    default: m.PdfViewer,
  })),
)

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
      className="group inline-flex items-center gap-2 border border-[#C5A059]/35 bg-[#1A1716] px-3 py-1.5 text-[0.68rem] font-medium tracking-[0.2em] text-[#E9D9B4] uppercase transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
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
        className="group inline-flex items-center gap-2 border border-[#C5A059]/35 bg-[#1A1716] px-5 py-2.5 text-[0.68rem] font-medium tracking-[0.2em] text-[#E9D9B4] uppercase transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
      >
        Open original link
        <ExternalLinkIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
      </a>
    </div>
  )
}

function UploadedVideoContent({ viewerUrl }: { viewerUrl: string | null }) {
  if (!viewerUrl) {
    return (
      <p className="px-6 py-8 text-sm text-[#8E816D]">Video unavailable.</p>
    )
  }

  return (
    <div className="bg-black">
      <video
        controls
        playsInline
        preload="metadata"
        src={viewerUrl}
        className="aspect-video w-full"
      >
        Your browser does not support video playback.
      </video>
    </div>
  )
}

function PdfContent({ viewerUrl }: { viewerUrl: string | null }) {
  if (!viewerUrl) {
    return (
      <p className="px-6 py-8 text-sm text-[#8E816D]">Document unavailable.</p>
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
        <PdfViewer url={viewerUrl} />
      </Suspense>
    </div>
  )
}

function OfficeContent({ viewerUrl }: { viewerUrl: string | null }) {
  if (!viewerUrl) {
    return (
      <p className="px-6 py-8 text-sm text-[#8E816D]">Document unavailable.</p>
    )
  }

  return (
    <div className="aspect-4/3 w-full">
      <iframe
        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewerUrl)}`}
        className="size-full border-0"
      />
    </div>
  )
}

function MediaContent({
  viewModel,
  media,
  viewerUrl,
}: {
  viewModel: MediaContentViewModel
  media: MediaDetailViewerProps['media']
  viewerUrl: string | null
}) {
  const { kind, videoId } = viewModel

  const bodyByKind: Record<MediaContentKind, ReactNode> = {
    youtube: (
      <YouTubeEmbed videoId={videoId ?? ''} originalUrl={media.fileUrl} />
    ),
    'unembeddable-video': <UnembeddableVideo fileUrl={media.fileUrl} />,
    'uploaded-video': <UploadedVideoContent viewerUrl={viewerUrl} />,
    pdf: <PdfContent viewerUrl={viewerUrl} />,
    office: <OfficeContent viewerUrl={viewerUrl} />,
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
}: MediaDetailViewerProps) {
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
        />
      </div>
    </>
  )
}
