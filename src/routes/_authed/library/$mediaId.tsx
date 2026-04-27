import { createFileRoute } from '@tanstack/react-router'
import { ExternalLinkIcon, FileTextIcon, VideoIcon } from 'lucide-react'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getLibraryMediaItem } from '@/utils/library'

export const Route = createFileRoute('/_authed/library/$mediaId')({
  loader: async ({ params }) => {
    return await getLibraryMediaItem({ data: { mediaId: params.mediaId } })
  },
  component: MediaDetailComponent,
})

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function MediaDetailComponent() {
  const loaderData = Route.useLoaderData()
  const { media, viewer } = loaderData

  const isVideo = media.fileType === 'video'

  return (
    <div
      className="relative isolate min-h-screen overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(255,255,255,0.92)), url(${facultyBackground})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(197,160,89,0.10),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.22),transparent_22%)]" />
      <div className="relative mx-auto max-w-5xl px-6 py-10 sm:px-8 sm:py-12">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="h-px w-8 bg-[#9B7A41]/50" />
            <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
              Library
            </div>
            <h1 className="mt-1 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
              {media.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="border border-[#1A1A1A]/10 bg-white/50 px-3 py-1 text-[0.68rem] font-medium tracking-[0.22em] text-[#4E463D] uppercase">
                {media.category}
              </span>
              {viewer.role !== 'student' && (
                <span
                  className={cn(
                    'border px-3 py-1 text-[0.68rem] font-medium tracking-[0.22em] uppercase',
                    media.isPublished
                      ? 'border-[#C5A059]/35 bg-white/50 text-[#9B7A41]'
                      : 'border-[#1A1A1A]/10 bg-white/40 text-[#5E5549]',
                  )}
                >
                  {media.isPublished ? 'Published' : 'Draft'}
                </span>
              )}
            </div>
          </div>

          <Button
            theme="light"
            onClick={() =>
              window.open(
                normalizeUrl(media.fileUrl),
                '_blank',
                'noopener,noreferrer',
              )
            }
          >
            <ExternalLinkIcon className="size-4" />
            Go
          </Button>
        </div>

        {media.description && (
          <div className="mb-8 border border-[#1A1A1A]/10 bg-white/60 p-6 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.08)]">
            <div className="text-[0.68rem] font-medium tracking-[0.22em] text-[#9B7A41] uppercase">
              Description
            </div>
            <p className="mt-3 text-sm leading-7 text-[#4E463D]">
              {media.description}
            </p>
          </div>
        )}

        <div className="border border-white/10 bg-[#151515]/88 shadow-[0_22px_44px_-28px_rgba(0,0,0,0.6)]">
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
          <div className="px-6 py-8">
            <p className="text-sm leading-7 text-[#D6CCBE]">
              {isVideo
                ? 'Open this YouTube video in a new tab.'
                : 'Open this PDF in a new tab.'}
            </p>
            <Button
              theme="dark"
              className="mt-5"
              onClick={() =>
                window.open(
                  normalizeUrl(media.fileUrl),
                  '_blank',
                  'noopener,noreferrer',
                )
              }
            >
              <ExternalLinkIcon className="size-4" />
              Open
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
