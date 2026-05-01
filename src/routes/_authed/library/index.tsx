import { createFileRoute, useRouter } from '@tanstack/react-router'
import {
  ExternalLinkIcon,
  EyeIcon,
  FileTextIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react'
import { useState } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import type { MediaLibraryRow } from '@/utils/library'
import { MediaDialog } from '@/components/dialog/MediaDialog'
import { Button } from '@/components/ui/button'
import { DataTable, createButtonColumn } from '@/components/table/DataTable'
import { getLibraryMedia } from '@/utils/library'
import facultyBackground from '@/assets/images/bg/bg_lecturers.webp'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authed/library/')({
  loader: async () => {
    return await getLibraryMedia()
  },
  component: LibraryComponent,
})

type DialogState =
  | { mode: 'create' }
  | { mode: 'edit'; media: MediaLibraryRow }
  | { mode: 'delete'; media: MediaLibraryRow }
  | null

const columnHelper = createColumnHelper<MediaLibraryRow>()

function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function getYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(normalizeUrl(url))

    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace('/', '')
      return id || null
    }

    const isYoutube =
      u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com'

    if (isYoutube) {
      const v = u.searchParams.get('v')
      if (v) return v

      if (u.pathname.startsWith('/embed/')) {
        const id = u.pathname.split('/embed/')[1]?.split('/')[0]
        return id || null
      }

      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/shorts/')[1]?.split('/')[0]
        return id || null
      }
    }

    return null
  } catch {
    return null
  }
}

function getYoutubeThumbnail(url: string): string | null {
  const id = getYoutubeVideoId(url)
  if (!id) return null
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

function LibraryComponent() {
  const loaderData = Route.useLoaderData()
  const router = useRouter()
  const { media, viewer } = loaderData
  const [dialogState, setDialogState] = useState<DialogState>(null)

  const isOpen = dialogState !== null
  const dialogMode = dialogState?.mode ?? 'create'
  const dialogMedia =
    dialogState && dialogState.mode !== 'create' ? dialogState.media : undefined

  const canCreate = viewer.role === 'teacher' || viewer.role === 'admin'

  const canManageRow = (row: MediaLibraryRow) => {
    if (viewer.role === 'admin') return true
    if (viewer.role === 'teacher') return row.uploaderId === viewer.id
    return false
  }

  const columns: Array<ColumnDef<MediaLibraryRow, any>> = [
    columnHelper.display({
      id: 'thumb',
      header: '',
      enableSorting: false,
      cell: (info) => {
        const row = info.row.original

        if (row.fileType === 'video') {
          const thumb = getYoutubeThumbnail(row.fileUrl)

          return (
            <button
              type="button"
              className="group relative aspect-video w-28 overflow-hidden border border-white/10 bg-black/20"
              onClick={() =>
                window.open(
                  normalizeUrl(row.fileUrl),
                  '_blank',
                  'noopener,noreferrer',
                )
              }
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
            </button>
          )
        }

        return (
          <div className="flex aspect-video w-28 items-center justify-center border border-white/10 bg-black/20 text-[#8E816D]">
            <FileTextIcon className="size-4" />
          </div>
        )
      },
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
      cell: (info) => {
        if (viewer.role === 'student')
          return <span className="text-[#8E816D]">—</span>
        return info.getValue() ? (
          <span className="border border-[#C5A059]/35 px-2 py-0.5 text-[0.62rem] font-medium tracking-[0.12em] text-[#D4B373] uppercase">
            Yes
          </span>
        ) : (
          <span className="border border-white/12 px-2 py-0.5 text-[0.62rem] font-medium tracking-[0.12em] text-[#8E816D] uppercase">
            No
          </span>
        )
      },
    }),
    createButtonColumn([
      {
        icon: EyeIcon,
        label: 'View',
        onClick: (row) =>
          router.navigate({
            to: '/library/$mediaId',
            params: { mediaId: row.id },
          }),
      },
      {
        icon: ExternalLinkIcon,
        label: 'Go',
        onClick: (row) =>
          window.open(
            normalizeUrl(row.fileUrl),
            '_blank',
            'noopener,noreferrer',
          ),
      },
      {
        icon: PencilIcon,
        label: 'Edit',
        show: (row) => canManageRow(row),
        onClick: (row) => setDialogState({ mode: 'edit', media: row }),
      },
      {
        icon: Trash2Icon,
        label: 'Delete',
        show: (row) => canManageRow(row),
        onClick: (row) => setDialogState({ mode: 'delete', media: row }),
      },
    ]),
  ]

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
      <div className="relative mx-auto max-w-7xl px-6 py-10 sm:px-8 sm:py-12">
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
            <Button
              theme="light"
              onClick={() => setDialogState({ mode: 'create' })}
            >
              <PlusIcon className="size-4" />
              Add Media
            </Button>
          )}
        </div>

        {media.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-[#1A1A1A]/20 bg-[#EDE8DE]/40 p-16 text-center">
            <FileTextIcon className="mb-3 size-8 text-[#9B7A41]/50" />
            <h3 className="font-serif text-lg text-[#1C1815]">No media yet</h3>
            <p className="mt-2 text-sm text-[#5E5549]">
              {canCreate
                ? 'Add the first library item to get started'
                : 'Check back later for new materials'}
            </p>
            {canCreate && (
              <Button
                theme="light"
                className="mt-4"
                onClick={() => setDialogState({ mode: 'create' })}
              >
                <PlusIcon className="size-4" />
                Add Media
              </Button>
            )}
          </div>
        ) : (
          <div className={cn(viewer.role === 'student' && 'mt-2')}>
            <DataTable
              columns={columns}
              data={media}
              pageSize={15}
              searchPlaceholder="Search library…"
            />
          </div>
        )}
      </div>

      <MediaDialog
        key={`${dialogMode}-${dialogMedia?.id}`}
        open={isOpen}
        onOpenChange={(open) => !open && setDialogState(null)}
        mode={dialogMode}
        media={dialogMedia}
      />
    </div>
  )
}
