import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  ChevronLeftIcon,
  ExternalLinkIcon,
  FileTextIcon,
  PencilIcon,
  TrashIcon,
  VideoIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageLayout } from '@/components/layout/page-layout'
import { cn } from '@/lib/utils'
import { getLibraryMediaItem } from '@/utils/library'
import { useDialogState } from '@/hooks/useDialogState'
import { MediaDialog } from '@/components/dialog/MediaDialog'

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
  const router = useRouter()
  const { media, viewer, permissions } = loaderData
  const {
    isOpen,
    dialogMode,
    dialogItem: dialogMedia,
    openDialog,
    closeDialog,
  } = useDialogState<typeof media>()

  const isVideo = media.fileType === 'video'

  return (
    <PageLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="mb-10 flex-1">
          <Button
            variant="ghost"
            theme="light"
            size="sm"
            className="mb-6 gap-1"
            onClick={() => router.history.back()}
          >
            <ChevronLeftIcon className="size-3.5" />
            Back
          </Button>

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

        <div className="flex items-center gap-2">
          {permissions.canManage && (
            <>
              <Button
                variant="ghost"
                theme="light"
                size="icon"
                className="size-8 border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] hover:border-[#C5A059]/40 hover:text-[#9B7A41]"
                onClick={() => openDialog('edit', media)}
              >
                <PencilIcon className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                theme="light"
                size="icon"
                className="size-8 border border-[#1A1A1A]/12 bg-white/60 text-[#5E5549] hover:border-red-300 hover:text-red-600"
                onClick={() => openDialog('delete', media)}
              >
                <TrashIcon className="size-3.5" />
              </Button>
            </>
          )}
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
