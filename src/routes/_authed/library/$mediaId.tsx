import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Suspense, lazy, useCallback, useEffect } from 'react'
import type { Role } from '@/utils/authz/types'
import type { MediaLibraryRow } from '@/utils/library/library'
import { PageLayout } from '@/components/layout/page-layout'
import { PageHeader } from '@/components/layout/page-header'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'
import { StarToggle } from '@/components/library/StarToggle'
import { cn } from '@/lib/utils'
import { getLibraryMediaItem } from '@/utils/library'
import { useDialogState } from '@/hooks/useDialogState'
import { useLibraryPrefs } from '@/hooks/useLibraryPrefs'
import { MediaDetailViewer } from '@/components/library/media-detail-viewer/MediaDetailViewer'
import { shouldShowDownloadableChip } from '@/utils/library/domain/library.domain'
import { isMediaStarred } from '@/utils/library/domain/library-prefs.domain'

const MediaDialog = lazy(() =>
  import('@/components/dialog/media-dialog/MediaDialog').then((module) => ({
    default: module.MediaDialog,
  })),
)

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

function MediaHeaderActions({
  starred,
  prefsLoaded,
  onToggleStar,
  media,
  permissions,
  onEdit,
  onDelete,
}: {
  starred: boolean
  prefsLoaded: boolean
  onToggleStar: () => void
  media: MediaLibraryRow
  permissions: { canEdit: boolean; isCourseTeacher: boolean }
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <StarToggle
        starred={starred}
        onToggle={onToggleStar}
        theme="light"
        className={cn(!prefsLoaded && 'pointer-events-none opacity-0')}
      />
      <EntityHeaderActions
        status={media.isPublished ? 'published' : 'draft'}
        canEdit={permissions.canEdit}
        isCourseTeacher={permissions.isCourseTeacher}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}

function MediaDetailDialog({
  dialogMode,
  dialogMedia,
  closeDialog,
  onDeleted,
}: {
  dialogMode: 'create' | 'edit' | 'delete'
  dialogMedia: MediaLibraryRow | undefined
  closeDialog: () => void
  onDeleted: () => void
}) {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-sm text-[#8E816D]">
          Loading media editor…
        </div>
      }
    >
      <MediaDialog
        key={`${dialogMode}-${dialogMedia?.id}`}
        open
        onOpenChange={(open) => {
          if (!open) {
            closeDialog()
          }
        }}
        mode={dialogMode}
        media={dialogMedia}
        onSuccess={() => {
          if (dialogMode === 'delete') {
            onDeleted()
          }
        }}
      />
    </Suspense>
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
  const { prefs, loaded, toggleStar, recordView, savePosition } =
    useLibraryPrefs(viewer.id)

  useEffect(() => {
    if (loaded) recordView(media.id)
  }, [loaded, media.id, recordView])

  const onPageChange = useCallback(
    (page: number) => savePosition(media.id, page),
    [media.id, savePosition],
  )

  return (
    <PageLayout>
      <PageHeader
        title={media.title}
        onBack={() => router.history.back()}
        metadata={
          <MediaDetailHeaderMetadata media={media} role={viewer.role} />
        }
        actions={
          <MediaHeaderActions
            starred={isMediaStarred(prefs, media.id)}
            prefsLoaded={loaded}
            onToggleStar={() => toggleStar(media.id)}
            media={media}
            permissions={permissions}
            onEdit={() => openDialog('edit', media)}
            onDelete={() => openDialog('delete', media)}
          />
        }
      />

      <MediaDetailViewer
        media={media}
        viewerUrl={viewerUrl}
        initialPage={loaded ? (prefs.positions[media.id] ?? 1) : null}
        onPageChange={onPageChange}
      />

      {isOpen && (
        <MediaDetailDialog
          dialogMode={dialogMode as 'create' | 'edit' | 'delete'}
          dialogMedia={dialogMedia}
          closeDialog={closeDialog}
          onDeleted={() => router.history.back()}
        />
      )}
    </PageLayout>
  )
}
