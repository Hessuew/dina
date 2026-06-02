import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ExternalLinkIcon, FileTextIcon, VideoIcon } from 'lucide-react'
import { Suspense, lazy } from 'react'
import { YouTubeEmbed } from '@/components/library/YouTubeEmbed'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'
import { cn } from '@/lib/utils'
import { getLibraryMediaItem } from '@/utils/library'
import { useDialogState } from '@/hooks/useDialogState'
import { MediaDialog } from '@/components/dialog/MediaDialog'

const PdfViewer = lazy(() =>
  import('@/components/library/PdfViewer').then((m) => ({
    default: m.PdfViewer,
  })),
)

export const Route = createFileRoute('/_authed/library/$mediaId')({
  loader: async ({ params }) => {
    return await getLibraryMediaItem({ data: { mediaId: params.mediaId } })
  },
  component: MediaDetailComponent,
})

function getYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'youtu.be') return u.pathname.replace('/', '') || null
    if (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') {
      if (u.searchParams.get('v')) return u.searchParams.get('v')
      if (u.pathname.startsWith('/embed/'))
        return u.pathname.split('/embed/')[1]?.split('/')[0] ?? null
    }
  } catch {}
  return null
}

function getFileExtension(url: string): string {
  return url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
}

function MediaDetailComponent() {
  const loaderData = Route.useLoaderData()
  const router = useRouter()
  const { media, viewerUrl, viewer, permissions } = loaderData
  const {
    isOpen,
    dialogMode,
    dialogItem: dialogMedia,
    openDialog,
    closeDialog,
  } = useDialogState<typeof media>()

  const isVideo = media.fileType === 'video'
  const ext = getFileExtension(media.fileUrl)
  const isPdf = ext === 'pdf'
  const isOffice = ext === 'pptx' || ext === 'docx'
  const videoId = isVideo ? getYoutubeVideoId(media.fileUrl) : null

  return (
    <PageLayout>
      <PageHeader
        title={media.title}
        onBack={() => router.history.back()}
        metadata={
          <>
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
          </>
        }
        actions={
          <EntityHeaderActions
            status={media.isPublished ? 'published' : 'draft'}
            canEdit={permissions.canEdit}
            isCourseTeacher={permissions.isCourseTeacher}
            onEdit={() => openDialog('edit', media)}
            onDelete={() => openDialog('delete', media)}
          />
        }
      />

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

        <div className="overflow-hidden">
          {isVideo && videoId && (
            <YouTubeEmbed videoId={videoId} originalUrl={media.fileUrl} />
          )}

          {isVideo && !videoId && (
            <div className="flex flex-col items-center gap-5 px-6 py-14 text-center">
              <p className="text-sm text-[#8E816D]">
                This video URL could not be parsed for embedding.
              </p>
              <a
                href={media.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 border border-[#C5A059]/35 bg-[#1A1716] px-5 py-2.5 text-[0.68rem] font-medium tracking-[0.2em] text-[#E9D9B4] uppercase transition-all hover:-translate-y-0.5 hover:border-[#D6B16E] hover:text-white"
              >
                Open original link
                <ExternalLinkIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          )}

          {isPdf && viewerUrl && (
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
          )}

          {isPdf && !viewerUrl && (
            <p className="px-6 py-8 text-sm text-[#8E816D]">
              Document unavailable.
            </p>
          )}

          {isOffice && viewerUrl && (
            <div className="aspect-4/3 w-full">
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewerUrl)}`}
                className="size-full border-0"
              />
            </div>
          )}

          {isOffice && !viewerUrl && (
            <p className="px-6 py-8 text-sm text-[#8E816D]">
              Document unavailable.
            </p>
          )}
        </div>
      </div>

      <MediaDialog
        key={`${dialogMode}-${dialogMedia?.id}`}
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDialog()
          }
        }}
        mode={dialogMode as 'create' | 'edit' | 'delete'}
        media={dialogMedia}
        onSuccess={() => {
          if (dialogMode === 'delete') {
            router.history.back()
          }
        }}
      />
    </PageLayout>
  )
}
