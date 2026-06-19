import { ExternalLinkIcon, FileTextIcon, VideoIcon } from 'lucide-react'
import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { YouTubeEmbed } from '@/components/library/YouTubeEmbed'
import {
  buildMediaContentViewModel,
  type MediaContentKind,
  type MediaContentViewModel,
} from '@/components/library/domain/media-content.domain'

const PdfViewer = lazy(() =>
  import('@/components/library/PdfViewer').then((m) => ({
    default: m.PdfViewer,
  })),
)

type MediaDetailViewerProps = {
  media: {
    title: string
    description: string | null
    fileType: string
    fileUrl: string
  }
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

function MediaViewerHeader({ isVideo }: { isVideo: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
      <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#8E816D] uppercase">
        {isVideo ? 'Video' : 'Document'}
      </div>
      <div className="text-[#8E816D]">
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
    viewModel.kind === 'youtube' || viewModel.kind === 'unembeddable-video'

  return (
    <>
      <MediaDescription description={media.description} />
      <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
        <MediaViewerHeader isVideo={isVideo} />
        <MediaContent
          viewModel={viewModel}
          media={media}
          viewerUrl={viewerUrl}
        />
      </div>
    </>
  )
}
