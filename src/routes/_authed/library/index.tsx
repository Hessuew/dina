import { Link, createFileRoute } from '@tanstack/react-router'
import { FileTextIcon, PlusIcon } from 'lucide-react'
import { createColumnHelper } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import type { MediaLibraryRow } from '@/utils/library'
import type { Role } from '@/utils/authz/types'
import { useDialogState } from '@/hooks/useDialogState'
import { MediaDialog } from '@/components/dialog/media-dialog/MediaDialog'
import { Button } from '@/components/ui/button'
import { DataTable, createButtonColumn } from '@/components/table/DataTable'
import { getLibraryMedia } from '@/utils/library'
import {
  canCreateMedia,
  canManageMediaRow,
  getVisibleShelfTopics,
  getYoutubeThumbnail,
} from '@/utils/library/domain/library-view.domain'
import { PageLayout } from '@/components/layout/page-layout'
import { EmptyState } from '@/components/ui/empty-state/EmptyState'
import { createCrudActions } from '@/components/table/functions/createCrudActions'
import { LibraryShelf } from '@/components/library/LibraryShelf'

export const Route = createFileRoute('/_authed/library/')({
  loader: async () => {
    return await getLibraryMedia()
  },
  component: LibraryComponent,
})

const columnHelper = createColumnHelper<MediaLibraryRow>()

function ThumbCell({ row }: { row: MediaLibraryRow }) {
  if (row.fileType === 'video') {
    const thumb = getYoutubeThumbnail(row.fileUrl)

    return (
      <Link
        to="/library/$mediaId"
        params={{ mediaId: row.id }}
        className="group relative block aspect-video w-28 border border-white/10 bg-black/20"
      >
        {thumb ? (
          <img
            src={thumb}
            alt={row.title}
            className="size-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-[#8E816D]">
            Video
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-black/50" />
      </Link>
    )
  }

  return (
    <Link
      to="/library/$mediaId"
      params={{ mediaId: row.id }}
      className="group relative flex aspect-video w-28 items-center justify-center border border-white/10 bg-black/20 text-[#8E816D]"
    >
      {row.thumbnailUrl ? (
        <img
          src={row.thumbnailUrl}
          alt={row.title}
          className="size-full object-cover transition-transform group-hover:scale-[1.02]"
        />
      ) : (
        <FileTextIcon className="size-4" />
      )}
    </Link>
  )
}

function PublishedCell({
  isPublished,
  viewerRole,
}: {
  isPublished: boolean
  viewerRole: Role
}) {
  if (viewerRole === 'student') return <span className="text-[#8E816D]">—</span>
  return isPublished ? (
    <span className="border border-[#C5A059]/35 px-2 py-0.5 text-[0.62rem] font-medium tracking-[0.12em] text-[#D4B373] uppercase">
      Yes
    </span>
  ) : (
    <span className="border border-white/12 px-2 py-0.5 text-[0.62rem] font-medium tracking-[0.12em] text-[#8E816D] uppercase">
      No
    </span>
  )
}

function LibraryComponent() {
  const loaderData = Route.useLoaderData()
  const { media, viewer } = loaderData
  const {
    isOpen,
    dialogMode,
    dialogItem: dialogMedia,
    openDialog,
    closeDialog,
  } = useDialogState<MediaLibraryRow>()

  const canCreate = canCreateMedia(viewer.role)

  const { shelves, shelfTopics } = getVisibleShelfTopics(media)

  const canManageRow = (row: MediaLibraryRow) => canManageMediaRow(viewer, row)

  const columns: Array<ColumnDef<MediaLibraryRow, any>> = [
    columnHelper.display({
      id: 'thumb',
      header: '',
      enableSorting: false,
      cell: (info) => <ThumbCell row={info.row.original} />,
    }),
    columnHelper.accessor('title', {
      header: 'Name',
      cell: (info) => (
        <span className="font-medium text-[#F8F4EC]">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('category', {
      header: 'Category',
      cell: (info) => (
        <span className="text-[0.82rem] text-[#AFA28F]">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('isPublished', {
      header: 'Published',
      cell: (info) => (
        <PublishedCell isPublished={info.getValue()} viewerRole={viewer.role} />
      ),
    }),
    createButtonColumn([
      ...createCrudActions<MediaLibraryRow>({
        viewTo: (row) => ({
          to: '/library/$mediaId',
          params: { mediaId: row.id },
        }),
        onEdit: (row) => openDialog('edit', row),
        onDelete: (row) => openDialog('delete', row),
        canManage: (row) => canManageRow(row),
      }),
    ]),
  ]

  return (
    <PageLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="h-px w-8 bg-[#9B7A41]/50" />
          <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
            Resources
          </div>
          <h1 className="mt-1 font-serif text-3xl tracking-[-0.02em] text-[#1C1815] sm:text-4xl">
            Library
          </h1>
          <p className="mt-2 text-sm text-[#5E5549]">
            Browse videos and documents shared by teachers
          </p>
        </div>

        {canCreate && (
          <Button theme="light" onClick={() => openDialog('create')}>
            <PlusIcon className="size-4" />
            Add Media
          </Button>
        )}
      </div>

      {media.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          heading="No media yet"
          description={
            canCreate
              ? 'Add the first library item to get started'
              : 'Check back later for new materials'
          }
          actionLabel="Add Media"
          onAction={() => openDialog('create')}
          showAction={canCreate}
          variant="light"
        />
      ) : (
        <>
          {shelfTopics.length === 0 ? (
            <p className="text-sm text-[#8E816D]">
              No content has been organized into shelves yet.
            </p>
          ) : (
            <div className="flex flex-col gap-12">
              {shelfTopics.map((topic) => {
                const shelf = shelves.get(topic)
                if (!shelf) return null
                return (
                  <LibraryShelf
                    key={topic}
                    topic={topic}
                    ebooks={shelf.ebooks}
                    audioVisual={shelf.audioVisual}
                    viewerRole={viewer.role}
                    permissions={{
                      canEdit: canCreate,
                      isCourseTeacher: canCreate,
                    }}
                    onEditMedia={(media) => openDialog('edit', media)}
                    onDeleteMedia={(media) => openDialog('delete', media)}
                  />
                )
              })}
            </div>
          )}

          {canCreate && (
            <div className="mt-16">
              <div className="mb-6">
                <div className="h-px w-8 bg-[#9B7A41]/50" />
                <div className="mt-2 text-[0.68rem] font-medium tracking-[0.3em] text-[#9B7A41] uppercase">
                  Manage
                </div>
                <h2 className="mt-1 font-serif text-xl tracking-[-0.02em] text-[#1C1815]">
                  All Media
                </h2>
              </div>
              <DataTable
                columns={columns}
                data={media}
                pageSize={15}
                searchPlaceholder="Search library…"
              />
            </div>
          )}
        </>
      )}

      <MediaDialog
        key={`${dialogMode}-${dialogMedia?.id}`}
        open={isOpen}
        onOpenChange={(open) => !open && closeDialog()}
        mode={dialogMode as 'create' | 'edit' | 'delete'}
        media={dialogMedia}
      />
    </PageLayout>
  )
}
