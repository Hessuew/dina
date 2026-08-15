import { createFileRoute, useRouter } from '@tanstack/react-router'
import type { Role } from '@/utils/authz/types'
import type { MediaLibraryRow } from '@/utils/library/library'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'
import { cn } from '@/lib/utils'
import { getLibraryMediaItem } from '@/utils/library'
import { useDialogState } from '@/hooks/useDialogState'
import { MediaDialog } from '@/components/dialog/media-dialog/MediaDialog'
import { MediaDetailViewer } from '@/components/library/media-detail-viewer/MediaDetailViewer'
import { shouldShowDownloadableChip } from '@/utils/library/domain/library.domain'

export const Route = createFileRoute('/_authed/library/$mediaId')({
  loader: async ({ params }) => {
    return await getLibraryMediaItem({ data: { mediaId: params.mediaId } })
  },
  component: MediaDetailComponent,
})

function MediaDownloadableChip() {
  return (
    <span className="border border-[#C5A059]/35 bg-white/50 px-3 py-1 text-[0.68rem] font-medium tracking-[0.22em] text-[#9B7A41] uppercase">
      Downloadable
    </span>
  )
}

function MediaStatusChip({ isPublished }: { isPublished: boolean }) {
  return (
    <span
      className={cn(
        'border px-3 py-1 text-[0.68rem] font-medium tracking-[0.22em] uppercase',
        isPublished
          ? 'border-[#C5A059]/35 bg-white/50 text-[#9B7A41]'
          : 'border-[#1A1A1A]/10 bg-white/40 text-[#5E5549]',
      )}
    >
      {isPublished ? 'Published' : 'Draft'}
    </span>
  )
}

function MediaDetailHeaderMetadata({
  media,
  role,
}: {
  media: Pick<
    MediaLibraryRow,
    'category' | 'isPublished' | 'fileType' | 'allowsDownload'
  >
  role: Role
}) {
  return (
    <>
      <span className="border border-[#1A1A1A]/10 bg-white/50 px-3 py-1 text-[0.68rem] font-medium tracking-[0.22em] text-[#4E463D] uppercase">
        {media.category}
      </span>
      {shouldShowDownloadableChip(media) && <MediaDownloadableChip />}
      {role !== 'student' && (
        <MediaStatusChip isPublished={media.isPublished} />
      )}
    </>
  )
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

  return (
    <PageLayout>
      <PageHeader
        title={media.title}
        onBack={() => router.history.back()}
        metadata={
          <MediaDetailHeaderMetadata media={media} role={viewer.role} />
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

      <MediaDetailViewer media={media} viewerUrl={viewerUrl} />

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
