import type { MediaLibraryRow } from '@/utils/library/library'
import { MediaCard } from '@/components/library/MediaCard'
import { EntityHeaderActions } from '@/components/layout/entity-header-actions'

type LibraryShelfPermissions = {
  canEdit: boolean
  isCourseTeacher: boolean
}

type LibraryShelfProps = {
  topic: string
  ebooks: Array<MediaLibraryRow>
  audioVisual: Array<MediaLibraryRow>
  viewerRole: 'student' | 'teacher' | 'admin'
  permissions?: LibraryShelfPermissions
  onEditMedia?: (item: MediaLibraryRow) => void
  onDeleteMedia?: (item: MediaLibraryRow) => void
}

function MediaCardWithActions({
  item,
  viewerRole,
  permissions,
  onEditMedia,
  onDeleteMedia,
}: {
  item: MediaLibraryRow
  viewerRole: 'student' | 'teacher' | 'admin'
  permissions?: LibraryShelfPermissions
  onEditMedia?: (item: MediaLibraryRow) => void
  onDeleteMedia?: (item: MediaLibraryRow) => void
}) {
  const canManage =
    permissions != null &&
    onEditMedia != null &&
    onDeleteMedia != null &&
    permissions.canEdit &&
    permissions.isCourseTeacher

  return (
    <div className="group relative shrink-0">
      <MediaCard item={item} viewerRole={viewerRole} />
      {canManage && (
        <div
          className="absolute top-1 left-1 hidden group-hover:flex"
          onClick={(e) => e.preventDefault()}
        >
          <EntityHeaderActions
            status="published"
            canEdit={permissions.canEdit}
            isCourseTeacher={permissions.isCourseTeacher}
            showStatus={false}
            theme="dark"
            size="sm"
            onEdit={() => onEditMedia(item)}
            onDelete={() => onDeleteMedia(item)}
          />
        </div>
      )}
    </div>
  )
}

export function LibraryShelf({
  topic,
  ebooks,
  audioVisual,
  viewerRole,
  permissions,
  onEditMedia,
  onDeleteMedia,
}: LibraryShelfProps) {
  return (
    <section className="flex flex-col gap-5">
      <div>
        <div className="h-px w-8 bg-[#9B7A41]/50" />
        <h2 className="mt-2 font-serif text-xl tracking-[-0.01em] text-[#1C1815]">
          {topic}
        </h2>
      </div>

      {ebooks.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[0.68rem] font-medium tracking-[0.25em] text-[#9B7A41] uppercase">
            eBooks
          </p>
          <div className="flex gap-4 pb-2">
            {ebooks.map((item) => (
              <MediaCardWithActions
                key={item.id}
                item={item}
                viewerRole={viewerRole}
                permissions={permissions}
                onEditMedia={onEditMedia}
                onDeleteMedia={onDeleteMedia}
              />
            ))}
          </div>
        </div>
      )}

      {audioVisual.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[0.68rem] font-medium tracking-[0.25em] text-[#9B7A41] uppercase">
            Audio-Visual
          </p>
          <div className="flex gap-4 pb-2">
            {audioVisual.map((item) => (
              <MediaCardWithActions
                key={item.id}
                item={item}
                viewerRole={viewerRole}
                permissions={permissions}
                onEditMedia={onEditMedia}
                onDeleteMedia={onDeleteMedia}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
